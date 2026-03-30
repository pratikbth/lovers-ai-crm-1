#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class WedUsCRMTester:
    def __init__(self, base_url="https://nuptial-pipeline.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.team_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "details": details})

    def test_api_health(self):
        """Test if API is accessible"""
        try:
            response = self.session.get(f"{self.base_url}/api/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}" if not success else ""
            self.log_test("API Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("API Health Check", False, str(e))
            return False

    def test_admin_login(self):
        """Test admin login"""
        try:
            data = {"email": "admin@wedus.com", "password": "admin123"}
            response = self.session.post(f"{self.base_url}/api/auth/login", json=data, timeout=10)
            
            if response.status_code == 200:
                user_data = response.json()
                success = user_data.get("role") == "admin" and user_data.get("email") == "admin@wedus.com"
                details = f"Role: {user_data.get('role')}, Email: {user_data.get('email')}" if not success else ""
                self.log_test("Admin Login", success, details)
                return success, user_data
            else:
                self.log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False, None
        except Exception as e:
            self.log_test("Admin Login", False, str(e))
            return False, None

    def test_team_member_login(self):
        """Test team member login"""
        try:
            data = {"email": "priya@wedus.com", "password": "team123"}
            response = self.session.post(f"{self.base_url}/api/auth/login", json=data, timeout=10)
            
            if response.status_code == 200:
                user_data = response.json()
                success = user_data.get("role") == "team_member" and user_data.get("email") == "priya@wedus.com"
                details = f"Role: {user_data.get('role')}, Email: {user_data.get('email')}" if not success else ""
                self.log_test("Team Member Login (Priya)", success, details)
                return success, user_data
            else:
                self.log_test("Team Member Login (Priya)", False, f"Status: {response.status_code}, Response: {response.text}")
                return False, None
        except Exception as e:
            self.log_test("Team Member Login (Priya)", False, str(e))
            return False, None

    def test_auth_me_endpoint(self):
        """Test /api/auth/me endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/auth/me", timeout=10)
            
            if response.status_code == 200:
                user_data = response.json()
                success = "id" in user_data and "email" in user_data and "role" in user_data
                details = f"Missing fields in response" if not success else ""
                self.log_test("Auth Me Endpoint", success, details)
                return success, user_data
            else:
                self.log_test("Auth Me Endpoint", False, f"Status: {response.status_code}")
                return False, None
        except Exception as e:
            self.log_test("Auth Me Endpoint", False, str(e))
            return False, None

    def test_team_endpoint(self):
        """Test /api/team endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/team", timeout=10)
            
            if response.status_code == 200:
                team_data = response.json()
                success = isinstance(team_data, list) and len(team_data) >= 4  # Admin + 3 team members
                details = f"Expected at least 4 members, got {len(team_data)}" if not success else f"Found {len(team_data)} team members"
                self.log_test("Team Endpoint", success, details)
                return success, team_data
            else:
                self.log_test("Team Endpoint", False, f"Status: {response.status_code}")
                return False, None
        except Exception as e:
            self.log_test("Team Endpoint", False, str(e))
            return False, None

    def test_leads_count_endpoint(self):
        """Test /api/leads/count endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/leads/count", timeout=10)
            
            if response.status_code == 200:
                count_data = response.json()
                required_keys = ["total", "today", "tomorrow", "thisWeek", "meetingDone", "interested"]
                success = all(key in count_data for key in required_keys)
                details = f"Missing keys: {[k for k in required_keys if k not in count_data]}" if not success else ""
                self.log_test("Leads Count Endpoint", success, details)
                return success, count_data
            else:
                self.log_test("Leads Count Endpoint", False, f"Status: {response.status_code}")
                return False, None
        except Exception as e:
            self.log_test("Leads Count Endpoint", False, str(e))
            return False, None

    def test_dashboard_stats_endpoint(self):
        """Test /api/stats/dashboard endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/stats/dashboard", timeout=10)
            
            if response.status_code == 200:
                stats_data = response.json()
                required_keys = ["totalLeads", "todayFollowups", "interestedLeads", "categoryStats", "pipelineStats"]
                success = all(key in stats_data for key in required_keys)
                details = f"Missing keys: {[k for k in required_keys if k not in stats_data]}" if not success else ""
                self.log_test("Dashboard Stats Endpoint", success, details)
                return success, stats_data
            else:
                self.log_test("Dashboard Stats Endpoint", False, f"Status: {response.status_code}")
                return False, None
        except Exception as e:
            self.log_test("Dashboard Stats Endpoint", False, str(e))
            return False, None

    def test_leads_endpoint(self):
        """Test /api/leads endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/leads", timeout=10)
            
            if response.status_code == 200:
                leads_data = response.json()
                success = (isinstance(leads_data, dict) and 
                          "leads" in leads_data and 
                          isinstance(leads_data["leads"], list) and
                          "total" in leads_data)
                details = f"Expected dict with 'leads' list, got {type(leads_data)}" if not success else f"Found {len(leads_data.get('leads', []))} leads"
                self.log_test("Leads Endpoint", success, details)
                return success, leads_data
            else:
                self.log_test("Leads Endpoint", False, f"Status: {response.status_code}")
                return False, None
        except Exception as e:
            self.log_test("Leads Endpoint", False, str(e))
            return False, None

    def test_create_team_member_admin_only(self):
        """Test creating team member (admin only)"""
        try:
            new_member = {
                "name": "Test User",
                "email": f"test_{datetime.now().strftime('%H%M%S')}@wedus.com",
                "password": "test123"
            }
            response = self.session.post(f"{self.base_url}/api/team", json=new_member, timeout=10)
            
            if response.status_code == 200:
                member_data = response.json()
                success = member_data.get("email") == new_member["email"] and member_data.get("role") == "team_member"
                details = f"Created member: {member_data.get('name')}" if success else "Failed to create member properly"
                self.log_test("Create Team Member (Admin)", success, details)
                return success, member_data
            else:
                self.log_test("Create Team Member (Admin)", False, f"Status: {response.status_code}, Response: {response.text}")
                return False, None
        except Exception as e:
            self.log_test("Create Team Member (Admin)", False, str(e))
            return False, None

    def test_create_lead(self):
        """Test creating a new lead"""
        try:
            new_lead = {
                "companyName": f"Test Company {datetime.now().strftime('%H%M%S')}",
                "phone": "9876543210",
                "email": "test@example.com",
                "city": "Mumbai",
                "category": "Needs Review",
                "priority": "Medium"
            }
            response = self.session.post(f"{self.base_url}/api/leads", json=new_lead, timeout=10)
            
            if response.status_code == 200:
                lead_data = response.json()
                success = (lead_data.get("companyName") == new_lead["companyName"] and 
                          "id" in lead_data)
                details = f"Created lead: {lead_data.get('companyName')}" if success else "Failed to create lead properly"
                self.log_test("Create Lead", success, details)
                return success, lead_data
            else:
                self.log_test("Create Lead", False, f"Status: {response.status_code}, Response: {response.text}")
                return False, None
        except Exception as e:
            self.log_test("Create Lead", False, str(e))
            return False, None

    def test_get_single_lead(self, lead_id):
        """Test getting a single lead by ID"""
        try:
            response = self.session.get(f"{self.base_url}/api/leads/{lead_id}", timeout=10)
            
            if response.status_code == 200:
                lead_data = response.json()
                success = lead_data.get("id") == lead_id
                details = f"Retrieved lead: {lead_data.get('companyName')}" if success else "Lead data mismatch"
                self.log_test("Get Single Lead", success, details)
                return success, lead_data
            else:
                self.log_test("Get Single Lead", False, f"Status: {response.status_code}")
                return False, None
        except Exception as e:
            self.log_test("Get Single Lead", False, str(e))
            return False, None

    def test_add_response_to_lead(self, lead_id):
        """Test adding a response/call log to a lead"""
        try:
            response_data = {
                "response": "Interested",
                "notes": "Customer showed interest in our services",
                "duration": 5,
                "nextFollowupDate": "2024-12-31T10:00:00"
            }
            response = self.session.post(f"{self.base_url}/api/leads/{lead_id}/response", json=response_data, timeout=10)
            
            if response.status_code == 200:
                lead_data = response.json()
                success = (len(lead_data.get("responseHistory", [])) > 0 and
                          lead_data.get("callCount", 0) > 0)
                details = f"Added response, call count: {lead_data.get('callCount')}" if success else "Failed to add response"
                self.log_test("Add Response to Lead", success, details)
                return success, lead_data
            else:
                self.log_test("Add Response to Lead", False, f"Status: {response.status_code}, Response: {response.text}")
                return False, None
        except Exception as e:
            self.log_test("Add Response to Lead", False, str(e))
            return False, None

    def test_pipeline_stage_update(self, lead_id):
        """Test updating pipeline stage via PATCH (drag and drop simulation)"""
        try:
            # Test updating to different pipeline stages
            test_stages = ["Interested", "Send Portfolio", "Meeting Scheduled"]
            
            for stage in test_stages:
                update_data = {"pipelineStage": stage}
                response = self.session.patch(f"{self.base_url}/api/leads/{lead_id}", json=update_data, timeout=10)
                
                if response.status_code == 200:
                    lead_data = response.json()
                    success = lead_data.get("pipelineStage") == stage
                    if success:
                        self.log_test(f"Pipeline Stage Update to {stage}", True, f"Updated to {stage}")
                    else:
                        self.log_test(f"Pipeline Stage Update to {stage}", False, f"Expected {stage}, got {lead_data.get('pipelineStage')}")
                        return False
                else:
                    self.log_test(f"Pipeline Stage Update to {stage}", False, f"Status: {response.status_code}")
                    return False
            
            return True
        except Exception as e:
            self.log_test("Pipeline Stage Update", False, str(e))
            return False

    def test_leads_by_pipeline_stage(self):
        """Test filtering leads by pipeline stage"""
        try:
            # Test filtering by different pipeline stages
            test_stages = ["New Contact", "Interested", "Send Portfolio"]
            
            for stage in test_stages:
                response = self.session.get(f"{self.base_url}/api/leads?pipelineStage={stage}", timeout=10)
                
                if response.status_code == 200:
                    leads_data = response.json()
                    leads = leads_data.get("leads", [])
                    # Check that all returned leads have the correct pipeline stage
                    success = all(lead.get("pipelineStage") == stage for lead in leads)
                    details = f"Found {len(leads)} leads in {stage}" if success else f"Some leads have wrong pipeline stage"
                    self.log_test(f"Filter Leads by Pipeline Stage ({stage})", success, details)
                    if not success:
                        return False
                else:
                    self.log_test(f"Filter Leads by Pipeline Stage ({stage})", False, f"Status: {response.status_code}")
                    return False
            
            return True
        except Exception as e:
            self.log_test("Filter Leads by Pipeline Stage", False, str(e))
            return False

    def test_create_lead_with_pipeline_stage(self):
        """Test creating leads with specific pipeline stages"""
        try:
            test_stages = ["New Contact", "Interested", "Unknown", "Call Again 1"]
            created_leads = []
            
            for stage in test_stages:
                new_lead = {
                    "companyName": f"Pipeline Test {stage} {datetime.now().strftime('%H%M%S')}",
                    "phone": "9876543210",
                    "city": "Delhi",
                    "pipelineStage": stage,
                    "category": "Needs Review",
                    "priority": "Medium"
                }
                response = self.session.post(f"{self.base_url}/api/leads", json=new_lead, timeout=10)
                
                if response.status_code == 200:
                    lead_data = response.json()
                    success = lead_data.get("pipelineStage") == stage
                    if success:
                        created_leads.append(lead_data.get("id"))
                        self.log_test(f"Create Lead in {stage}", True, f"Created lead in {stage}")
                    else:
                        self.log_test(f"Create Lead in {stage}", False, f"Expected {stage}, got {lead_data.get('pipelineStage')}")
                        return False, []
                else:
                    self.log_test(f"Create Lead in {stage}", False, f"Status: {response.status_code}")
                    return False, []
            
            return True, created_leads
        except Exception as e:
            self.log_test("Create Lead with Pipeline Stage", False, str(e))
            return False, []
        """Test logout functionality"""
        try:
            response = self.session.post(f"{self.base_url}/api/auth/logout", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}" if not success else ""
            self.log_test("Logout", success, details)
            return success
        except Exception as e:
            self.log_test("Logout", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Wed Us CRM Backend Tests")
        print("=" * 50)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test admin login
        admin_success, admin_data = self.test_admin_login()
        if not admin_success:
            print("❌ Admin login failed. Stopping tests.")
            return False
        
        # Test authenticated endpoints with admin session
        self.test_auth_me_endpoint()
        self.test_team_endpoint()
        self.test_leads_count_endpoint()
        self.test_dashboard_stats_endpoint()
        leads_success, leads_data = self.test_leads_endpoint()
        self.test_create_team_member_admin_only()
        
        # Test lead CRUD operations
        create_success, new_lead = self.test_create_lead()
        if create_success and new_lead:
            lead_id = new_lead.get("id")
            self.test_get_single_lead(lead_id)
            self.test_add_response_to_lead(lead_id)
            # Test Pipeline-specific functionality
            self.test_pipeline_stage_update(lead_id)
        
        # Test Pipeline-specific endpoints
        self.test_leads_by_pipeline_stage()
        pipeline_create_success, pipeline_leads = self.test_create_lead_with_pipeline_stage()
        
        # Test team member login (new session)
        team_session = requests.Session()
        old_session = self.session
        self.session = team_session
        self.test_team_member_login()
        
        # Test endpoints with team member session
        self.test_auth_me_endpoint()
        self.test_leads_count_endpoint()
        
        # Switch back to admin session for logout test
        self.session = old_session
        self.test_logout()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

    def test_logout(self):
        """Test logout functionality"""
        try:
            response = self.session.post(f"{self.base_url}/api/auth/logout", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}" if not success else ""
            self.log_test("Logout", success, details)
            return success
        except Exception as e:
            self.log_test("Logout", False, str(e))
            return False

def main():
    tester = WedUsCRMTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())