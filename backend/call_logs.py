from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId


class CallLogCreate(BaseModel):
    lead_id: str
    duration: int  # in seconds
    notes: Optional[str] = None
    outcome: Optional[str] = None  # e.g., "positive", "neutral", "negative", "no answer"
    next_followup: Optional[str] = None  # ISO datetime string


class CallLogUpdate(BaseModel):
    duration: Optional[int] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None
    next_followup: Optional[str] = None


class CallLogResponse(BaseModel):
    id: str
    lead_id: str
    created_by: str
    created_by_name: Optional[str] = None
    duration: int
    notes: Optional[str] = None
    outcome: Optional[str] = None
    next_followup: Optional[str] = None
    created_at: str


# ============== CALL LOG ENDPOINTS ==============

# Add these endpoints to your FastAPI router in server.py:

"""
# Place this section in server.py after the LEADS ROUTES section

@api_router.get("/call-logs/lead/{lead_id}")
async def get_lead_call_logs(
    lead_id: str,
    request: Request,
    limit: int = 50,
    skip: int = 0
):
    '''Get all call logs for a specific lead'''
    user = await get_current_user(request)
    
    # Verify lead exists and user has access
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if user["role"] == "team_member" and lead.get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    call_logs = await db.call_logs.find(
        {"lead_id": lead_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    if call_logs:
        for log in call_logs:
            log["id"] = str(log["_id"])
            del log["_id"]
            log["created_at"] = log["created_at"].isoformat()
    
    total = await db.call_logs.count_documents({"lead_id": lead_id})
    
    return {
        "call_logs": call_logs,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@api_router.get("/call-logs/{call_log_id}")
async def get_call_log(call_log_id: str, request: Request):
    '''Get a specific call log'''
    user = await get_current_user(request)
    
    call_log = await db.call_logs.find_one({"_id": ObjectId(call_log_id)})
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    # Verify user has access to the lead
    lead = await db.leads.find_one({"_id": ObjectId(call_log["lead_id"])})
    if user["role"] == "team_member" and lead.get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    call_log["id"] = str(call_log["_id"])
    del call_log["_id"]
    call_log["created_at"] = call_log["created_at"].isoformat()
    
    return call_log


@api_router.post("/call-logs")
async def create_call_log(call_log_data: CallLogCreate, request: Request):
    '''Create a new call log for a lead'''
    user = await get_current_user(request)
    
    # Verify lead exists
    lead = await db.leads.find_one({"_id": ObjectId(call_log_data.lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Verify user has access
    if user["role"] == "team_member" and lead.get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    call_log_doc = {
        "lead_id": call_log_data.lead_id,
        "created_by": user["id"],
        "created_by_name": user.get("name", "Unknown"),
        "duration": call_log_data.duration,
        "notes": call_log_data.notes,
        "outcome": call_log_data.outcome,
        "next_followup": call_log_data.next_followup,
        "created_at": datetime.utcnow()
    }
    
    result = await db.call_logs.insert_one(call_log_doc)
    
    # Update lead's last contacted date
    await db.leads.update_one(
        {"_id": ObjectId(call_log_data.lead_id)},
        {"$set": {"lastContactDate": datetime.utcnow()}}
    )
    
    call_log_doc["id"] = str(result.inserted_id)
    call_log_doc["created_at"] = call_log_doc["created_at"].isoformat()
    
    return call_log_doc


@api_router.put("/call-logs/{call_log_id}")
async def update_call_log(
    call_log_id: str,
    call_log_data: CallLogUpdate,
    request: Request
):
    '''Update a call log'''
    user = await get_current_user(request)
    
    call_log = await db.call_logs.find_one({"_id": ObjectId(call_log_id)})
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    # Verify user has access
    if user["role"] == "team_member" and call_log.get("created_by") != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot edit others' call logs")
    
    update_data = {k: v for k, v in call_log_data.dict().items() if v is not None}
    
    if update_data:
        await db.call_logs.update_one(
            {"_id": ObjectId(call_log_id)},
            {"$set": update_data}
        )
    
    updated = await db.call_logs.find_one({"_id": ObjectId(call_log_id)})
    updated["id"] = str(updated["_id"])
    del updated["_id"]
    updated["created_at"] = updated["created_at"].isoformat()
    
    return updated


@api_router.delete("/call-logs/{call_log_id}")
async def delete_call_log(call_log_id: str, request: Request):
    '''Delete a call log'''
    user = await get_current_user(request)
    
    call_log = await db.call_logs.find_one({"_id": ObjectId(call_log_id)})
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    # Only admins can delete others' call logs
    if user["role"] != "admin" and call_log.get("created_by") != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete others' call logs")
    
    await db.call_logs.delete_one({"_id": ObjectId(call_log_id)})
    
    return {"message": "Call log deleted"}


@api_router.get("/call-logs/user/stats")
async def get_user_call_stats(request: Request, days: int = 7):
    '''Get call statistics for the current user'''
    user = await get_current_user(request)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    call_logs = await db.call_logs.find({
        "created_by": user["id"],
        "created_at": {"$gte": start_date}
    }).to_list(length=None)
    
    total_calls = len(call_logs)
    total_duration = sum(log.get("duration", 0) for log in call_logs)
    avg_duration = total_duration / total_calls if total_calls > 0 else 0
    
    outcomes = {}
    for log in call_logs:
        outcome = log.get("outcome", "unknown")
        outcomes[outcome] = outcomes.get(outcome, 0) + 1
    
    return {
        "total_calls": total_calls,
        "total_duration_seconds": total_duration,
        "average_duration_seconds": avg_duration,
        "outcomes": outcomes,
        "period_days": days
    }
"""
