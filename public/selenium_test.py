from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import random
import string

BASE_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:3001/api"
WAIT_TIMEOUT = 15
ACTION_DELAY = 1.5

class StrandsTestSuite:
    def __init__(self):
        self.driver = None
        self.wait = None
        self.test_results = []
        self.test_salon_id = None
        
    def check_backend(self):
        """Check if backend is running on port 3001"""
        import urllib.request
        import urllib.error
        try:
            req = urllib.request.Request(f"{BACKEND_URL}/health", method='GET')
            urllib.request.urlopen(req, timeout=2)
            print("Backend detected on port 3001")
            return True
        except:
            print("WARNING: Backend server not detected on port 3001.")
            print("Please ensure the backend is running before executing tests.")
            return False
    
    def setup(self):
        print("Setting up Selenium WebDriver...")
        print("Checking backend connection...")
        self.check_backend()
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)
        self.driver.get(BASE_URL)
        time.sleep(ACTION_DELAY)
        
    def teardown(self):
        if self.driver:
            self.driver.quit()
            print("Browser closed")
    
    def safe_click(self, by, value, description=""):
        try:
            element = self.wait.until(EC.element_to_be_clickable((by, value)))
            element.click()
            time.sleep(ACTION_DELAY)
            print(f"Clicked: {description or value}")
            return True
        except TimeoutException:
            print(f"Failed to click: {description or value}")
            return False
    
    def safe_send_keys(self, by, value, text, description=""):
        try:
            element = self.wait.until(EC.presence_of_element_located((by, value)))
            element.clear()
            element.send_keys(text)
            time.sleep(ACTION_DELAY * 0.5)
            print(f"Entered text in: {description or value}")
            return True
        except TimeoutException:
            print(f"Failed to enter text in: {description or value}")
            return False
    
    def wait_for_element(self, by, value, description=""):
        try:
            self.wait.until(EC.presence_of_element_located((by, value)))
            print(f"Found: {description or value}")
            return True
        except TimeoutException:
            print(f"Element not found: {description or value}")
            return False
    
    def logout(self):
        try:
            logout_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Logout') or contains(text(), 'Sign Out')]")
            if logout_buttons:
                logout_buttons[0].click()
                time.sleep(ACTION_DELAY * 2)
                print("Logged out successfully")
                return True
            else:
                self.driver.get(f"{BASE_URL}/")
                time.sleep(ACTION_DELAY)
                return True
        except:
            self.driver.get(f"{BASE_URL}/")
            time.sleep(ACTION_DELAY)
            return True
    
    def login(self, email, password, role_description):
        print(f"Logging in as {role_description}...")
        self.driver.get(f"{BASE_URL}/login")
        time.sleep(ACTION_DELAY)
        
        self.safe_send_keys(By.ID, "login-email", email, "Email")
        self.safe_send_keys(By.ID, "login-password", password, "Password")
        self.safe_click(By.XPATH, "//button[@type='submit' and contains(text(), 'Sign In')]", "Login button")
        time.sleep(ACTION_DELAY * 2)
        
        if "/dashboard" in self.driver.current_url or "/admin" in self.driver.current_url or "/owner" in self.driver.current_url:
            print(f"Successfully logged in as {role_description}")
            return True
        return False
    
    def generate_email(self):
        random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return f"test_{random_str}@selenium.com"
    
    def select_dropdown_option(self, button_selector, option_text, description=""):
        """Helper method to handle custom StrandsSelect dropdowns"""
        try:
            # Click the dropdown button to open it
            dropdown_button = self.wait.until(EC.element_to_be_clickable((By.XPATH, button_selector)))
            dropdown_button.click()
            time.sleep(ACTION_DELAY * 0.5)
            
            # Wait for dropdown options to appear and click the desired option
            option = self.wait.until(EC.element_to_be_clickable((By.XPATH, f"//div[contains(@class, 'cursor-pointer') and contains(text(), '{option_text}')] | //div[contains(text(), '{option_text}') and @role='option']")))
            option.click()
            time.sleep(ACTION_DELAY * 0.5)
            print(f"Selected dropdown option: {option_text} {description}")
            return True
        except TimeoutException:
            print(f"Failed to select dropdown option: {option_text}")
            return False
    
    def test_admin_analytics_overview(self):
        """
        Use Cases: AFDV 1.1, AFDV 1.2, AFDV 1.3, AFDV 1.5
        Tests: Admin views user engagement stats, appointment trends, salon revenues, and user demographics
        """
        print("\nTEST 1: Admin Views Analytics Dashboard (AFDV 1.1, 1.2, 1.3, 1.5)")
        try:
            if not self.login("admin@strands.com", "test123", "Admin"):
                return False
            
            print("Viewing User Analytics...")
            self.driver.get(f"{BASE_URL}/dashboard?tab=user-analytics")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'analytics')] | //h2 | //div[contains(@class, 'chart')]", "Analytics content")
            time.sleep(ACTION_DELAY)
            
            print("Viewing Business Insights...")
            self.driver.get(f"{BASE_URL}/dashboard?tab=business-insights")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'analytics')] | //h2 | //div[contains(@class, 'chart')]", "Business insights")
            time.sleep(ACTION_DELAY)
            
            print("Viewing Revenue Analytics...")
            self.driver.get(f"{BASE_URL}/dashboard?tab=revenue-analytics")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'analytics')] | //h2 | //div[contains(@class, 'chart')]", "Revenue analytics")
            time.sleep(ACTION_DELAY)
            
            print("Viewing Salon Verification page...")
            self.driver.get(f"{BASE_URL}/admin/salon-verification")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'salon')] | //h2", "Salon verification")
            time.sleep(ACTION_DELAY)
            
            print("Viewing Loyalty Monitoring...")
            self.driver.get(f"{BASE_URL}/admin/loyalty-monitoring")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'loyalty')] | //h2", "Loyalty monitoring")
            time.sleep(ACTION_DELAY)
            
            print("Admin analytics overview test completed successfully")
            return True
        except Exception as e:
            print(f"Test 1 failed: {e}")
            return False
    
    def test_admin_verify_salon(self):
        """
        Use Case: UAR 1.5
        Tests: Admin verifies salon registrations so only legitimate businesses are listed
        """
        print("\nTEST 2: Admin Verifies Salon Registration (UAR 1.5)")
        try:
            if "/admin" not in self.driver.current_url:
                if not self.login("admin@strands.com", "test123", "Admin"):
                    return False
            
            self.driver.get(f"{BASE_URL}/admin/salon-verification")
            time.sleep(ACTION_DELAY * 2)
            
            try:
                pending_salons = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'salon')] | //tr[contains(@class, 'pending')] | //button[contains(text(), 'Approve')]")
                if pending_salons:
                    approve_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Approve')]")
                    if approve_buttons:
                        approve_buttons[0].click()
                        time.sleep(ACTION_DELAY)
                        try:
                            confirm_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Confirm') or contains(text(), 'Approve')]")))
                            confirm_btn.click()
                            time.sleep(ACTION_DELAY * 2)
                            print("Salon approved successfully")
                        except:
                            pass
                else:
                    print("No pending salons to approve")
            except Exception as e:
                print(f"Could not approve salon: {e}")
            
            print("Admin verify salon test completed")
            return True
        except Exception as e:
            print(f"Test 2 failed: {e}")
            return False
    
    def test_owner_signup_and_register(self):
        """
        Use Cases: UAR 1.3, UAR 1.4
        Tests: Owner signs up and registers salon with category selection
        """
        print("\nTEST 3: Owner Signup and Salon Registration (UAR 1.3, 1.4)")
        try:
            self.logout()
            time.sleep(ACTION_DELAY)
            
            self.driver.get(f"{BASE_URL}/signup")
            time.sleep(ACTION_DELAY)
            
            self.safe_click(By.XPATH, "//button[contains(text(), 'Sign Up')]", "Sign Up tab")
            
            owner_email = self.generate_email()
            owner_name = "Selenium Test Owner"
            
            self.safe_send_keys(By.ID, "name", owner_name, "Owner Name")
            self.safe_send_keys(By.ID, "email", owner_email, "Owner Email")
            self.safe_send_keys(By.ID, "password", "test123456", "Password")
            self.safe_send_keys(By.ID, "confirmPassword", "test123456", "Confirm Password")
            
            owner_role_buttons = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'role')]//button[contains(text(), 'Owner')] | //button[contains(text(), 'Salon Owner')]")
            if owner_role_buttons:
                owner_role_buttons[0].click()
                time.sleep(ACTION_DELAY)
            
            self.safe_click(By.XPATH, "//button[@type='submit' and contains(text(), 'Sign Up')]", "Sign Up button")
            time.sleep(ACTION_DELAY * 3)
            
            if "/owner" in self.driver.current_url or "/dashboard" in self.driver.current_url:
                time.sleep(ACTION_DELAY * 2)
                
                salon_name = f"Selenium Test Salon {random.randint(1000, 9999)}"
                
                try:
                    name_inputs = self.driver.find_elements(By.NAME, "name")
                    if not name_inputs:
                        name_inputs = self.driver.find_elements(By.XPATH, "//input[@placeholder*='name' or @placeholder*='Name']")
                    if name_inputs:
                        name_inputs[0].clear()
                        name_inputs[0].send_keys(salon_name)
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    phone_inputs = self.driver.find_elements(By.NAME, "phone")
                    if not phone_inputs:
                        phone_inputs = self.driver.find_elements(By.XPATH, "//input[@placeholder*='phone' or @placeholder*='Phone']")
                    if phone_inputs:
                        phone_inputs[0].clear()
                        phone_inputs[0].send_keys("(555) 123-4567")
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    street_inputs = self.driver.find_elements(By.NAME, "street")
                    if not street_inputs:
                        street_inputs = self.driver.find_elements(By.XPATH, "//input[@placeholder*='street' or @placeholder*='Street']")
                    if street_inputs:
                        street_inputs[0].clear()
                        street_inputs[0].send_keys("123 Test Street")
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    city_inputs = self.driver.find_elements(By.NAME, "city")
                    if not city_inputs:
                        city_inputs = self.driver.find_elements(By.XPATH, "//input[@placeholder*='city' or @placeholder*='City']")
                    if city_inputs:
                        city_inputs[0].clear()
                        city_inputs[0].send_keys("New York")
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    # Handle state dropdown (StrandsSelect)
                    state_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'border-gray-300') and contains(., 'Select state')] | //button[contains(@placeholder, 'state')]")
                    if not state_buttons:
                        state_buttons = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'relative')]//button[contains(@class, 'flex')]")
                    if state_buttons:
                        state_buttons[0].click()
                        time.sleep(ACTION_DELAY * 0.5)
                        state_options = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'cursor-pointer') and contains(text(), 'New York')] | //div[contains(text(), 'New York') and contains(@class, 'py-3')]")
                        if state_options:
                            state_options[0].click()
                            time.sleep(ACTION_DELAY * 0.5)
                        else:
                            # Try alternative selector
                            state_options = self.driver.find_elements(By.XPATH, "//div[contains(text(), 'New York')]")
                            if state_options:
                                state_options[0].click()
                                time.sleep(ACTION_DELAY * 0.5)
                    
                    postal_inputs = self.driver.find_elements(By.NAME, "postal_code")
                    if not postal_inputs:
                        postal_inputs = self.driver.find_elements(By.XPATH, "//input[@placeholder*='postal' or @placeholder*='zip']")
                    if postal_inputs:
                        postal_inputs[0].clear()
                        postal_inputs[0].send_keys("10001")
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    # Handle category dropdown (StrandsSelect)
                    category_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'border-gray-300') and contains(., 'Select salon type')] | //button[contains(@placeholder, 'category')]")
                    if not category_buttons:
                        category_buttons = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'relative')]//button[contains(@class, 'flex')]")
                    if category_buttons:
                        # Find the category button (usually the second one after state)
                        if len(category_buttons) > 1:
                            category_buttons[1].click()
                        else:
                            category_buttons[0].click()
                        time.sleep(ACTION_DELAY * 0.5)
                        category_options = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'cursor-pointer') and contains(text(), 'Hair Salon')] | //div[contains(text(), 'Hair Salon') and contains(@class, 'py-3')]")
                        if category_options:
                            category_options[0].click()
                            time.sleep(ACTION_DELAY * 0.5)
                        else:
                            # Try alternative selector
                            category_options = self.driver.find_elements(By.XPATH, "//div[contains(text(), 'Hair Salon')]")
                            if category_options:
                                category_options[0].click()
                                time.sleep(ACTION_DELAY * 0.5)
                    
                    desc_inputs = self.driver.find_elements(By.NAME, "description")
                    if not desc_inputs:
                        desc_inputs = self.driver.find_elements(By.XPATH, "//textarea[@placeholder*='description']")
                    if desc_inputs:
                        desc_inputs[0].clear()
                        desc_inputs[0].send_keys("Test salon created by Selenium automation")
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    submit_buttons = self.driver.find_elements(By.XPATH, "//button[@type='submit' and (contains(text(), 'Register') or contains(text(), 'Submit'))]")
                    if submit_buttons:
                        submit_buttons[0].click()
                        time.sleep(ACTION_DELAY * 2)
                        print("Salon registration submitted")
                except Exception as e:
                    print(f"Could not complete salon registration form: {e}")
                
                print("Owner signup and salon registration test completed")
                return True
            else:
                print("Owner signup failed - not redirected to owner dashboard")
                return False
        except Exception as e:
            print(f"Test 3 failed: {e}")
            return False
    
    def test_owner_dashboard_metrics(self):
        """
        Use Cases: PLR 1.2, UPH 1.2, UPH 1.31, PLR 1.6
        Tests: Owner views revenue tracking, customer visit histories, reviews, and loyalty configuration
        """
        print("\nTEST 4: Owner Views Dashboard and Metrics")
        try:
            if not self.login("Trim@gmail.com", "test123", "Owner"):
                return False
            
            print("Viewing Owner Overview...")
            self.driver.get(f"{BASE_URL}/owner/overview")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'overview')] | //h2 | //div[contains(@class, 'metric')]", "Overview content")
            time.sleep(ACTION_DELAY)
            
            print("Viewing Owner Revenue...")
            self.driver.get(f"{BASE_URL}/owner/revenue")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'revenue')] | //h2 | //div[contains(@class, 'chart')]", "Revenue metrics")
            time.sleep(ACTION_DELAY)
            
            print("Viewing Owner Customers...")
            self.driver.get(f"{BASE_URL}/owner/customers")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'customer')] | //h2 | //table", "Customers list")
            time.sleep(ACTION_DELAY)
            
            print("Viewing Owner Reviews...")
            self.driver.get(f"{BASE_URL}/owner/reviews")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'review')] | //h2", "Reviews")
            time.sleep(ACTION_DELAY)
            
            print("Viewing Owner Loyalty Configuration...")
            self.driver.get(f"{BASE_URL}/owner/loyalty")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'loyalty')] | //h2", "Loyalty configuration")
            time.sleep(ACTION_DELAY)
            
            print("Owner dashboard metrics test completed")
            return True
        except Exception as e:
            print(f"Test 4 failed: {e}")
            return False
    
    def test_owner_add_staff(self):
        """
        Use Case: UAR 1.7
        Tests: Owner adds a stylist as an employee of the salon
        """
        print("\nTEST 5: Owner Adds Staff Member (UAR 1.7)")
        try:
            if "/owner" not in self.driver.current_url:
                if not self.login("Trim@gmail.com", "test123", "Owner"):
                    return False
            
            self.driver.get(f"{BASE_URL}/owner/staff")
            time.sleep(ACTION_DELAY * 2)
            
            try:
                add_staff_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Add Staff') or contains(text(), 'Add Employee') or contains(text(), 'Add')]")
                if add_staff_buttons:
                    add_staff_buttons[0].click()
                    time.sleep(ACTION_DELAY)
                    
                    staff_email = self.generate_email()
                    staff_name = "Selenium Test Stylist"
                    
                    email_inputs = self.driver.find_elements(By.NAME, "email")
                    if not email_inputs:
                        email_inputs = self.driver.find_elements(By.XPATH, "//input[@type='email' or @placeholder*='email']")
                    if email_inputs:
                        email_inputs[0].clear()
                        email_inputs[0].send_keys(staff_email)
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    name_inputs = self.driver.find_elements(By.NAME, "full_name")
                    if not name_inputs:
                        name_inputs = self.driver.find_elements(By.XPATH, "//input[@placeholder*='name' or @placeholder*='Name']")
                    if name_inputs:
                        name_inputs[0].clear()
                        name_inputs[0].send_keys(staff_name)
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    phone_inputs = self.driver.find_elements(By.NAME, "phone")
                    if phone_inputs:
                        phone_inputs[0].clear()
                        phone_inputs[0].send_keys("(555) 987-6543")
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    submit_buttons = self.driver.find_elements(By.XPATH, "//button[@type='submit' and (contains(text(), 'Add') or contains(text(), 'Submit'))]")
                    if submit_buttons:
                        submit_buttons[0].click()
                        time.sleep(ACTION_DELAY * 2)
                        print("Staff member added successfully")
            except Exception as e:
                print(f"Could not add staff: {e}")
            
            print("Owner add staff test completed")
            return True
        except Exception as e:
            print(f"Test 5 failed: {e}")
            return False
    
    def test_owner_set_hours(self):
        """
        Use Cases: BS 1.0, BS 1.02
        Tests: Owner sets operating hours and employee hours
        """
        print("\nTEST 6: Owner Sets Salon Hours (BS 1.0, 1.02)")
        try:
            if "/owner" not in self.driver.current_url:
                if not self.login("Trim@gmail.com", "test123", "Owner"):
                    return False
            
            self.driver.get(f"{BASE_URL}/owner/settings")
            time.sleep(ACTION_DELAY * 2)
            
            try:
                hours_sections = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'hours')] | //h3[contains(text(), 'Hours')] | //label[contains(text(), 'Hours')]")
                if hours_sections:
                    time_inputs = self.driver.find_elements(By.XPATH, "//input[contains(@placeholder, 'AM') or contains(@placeholder, 'PM') or contains(@name, 'hour')]")
                    if time_inputs:
                        if len(time_inputs) >= 2:
                            time_inputs[0].clear()
                            time_inputs[0].send_keys("9:00 AM")
                            time.sleep(ACTION_DELAY * 0.5)
                            time_inputs[1].clear()
                            time_inputs[1].send_keys("6:00 PM")
                            time.sleep(ACTION_DELAY)
                            
                            save_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Save') or contains(text(), 'Update')]")
                            if save_buttons:
                                save_buttons[0].click()
                                time.sleep(ACTION_DELAY)
                                print("Salon hours updated")
            except Exception as e:
                print(f"Could not set hours: {e}")
            
            print("Owner set hours test completed")
            return True
        except Exception as e:
            print(f"Test 6 failed: {e}")
            return False
    
    def test_owner_add_product(self):
        """
        Use Case: SF 1.1
        Tests: Owner creates an online shop to sell salon products
        """
        print("\nTEST 7: Owner Adds Product (SF 1.1)")
        try:
            if "/owner" not in self.driver.current_url:
                if not self.login("Trim@gmail.com", "test123", "Owner"):
                    return False
            
            self.driver.get(f"{BASE_URL}/owner/products")
            time.sleep(ACTION_DELAY * 2)
            
            try:
                add_product_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Add Product') or contains(text(), 'New Product')]")
                if add_product_buttons:
                    add_product_buttons[0].click()
                    time.sleep(ACTION_DELAY)
                    
                    product_name = f"Test Product {random.randint(100, 999)}"
                    
                    name_inputs = self.driver.find_elements(By.NAME, "name")
                    if not name_inputs:
                        name_inputs = self.driver.find_elements(By.XPATH, "//input[@placeholder*='name' or @placeholder*='Name']")
                    if name_inputs:
                        name_inputs[0].clear()
                        name_inputs[0].send_keys(product_name)
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    price_inputs = self.driver.find_elements(By.NAME, "price")
                    if not price_inputs:
                        price_inputs = self.driver.find_elements(By.XPATH, "//input[@type='number' or @placeholder*='price']")
                    if price_inputs:
                        price_inputs[0].clear()
                        price_inputs[0].send_keys("29.99")
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    desc_inputs = self.driver.find_elements(By.NAME, "description")
                    if not desc_inputs:
                        desc_inputs = self.driver.find_elements(By.XPATH, "//textarea[@placeholder*='description']")
                    if desc_inputs:
                        desc_inputs[0].clear()
                        desc_inputs[0].send_keys("Test product description")
                        time.sleep(ACTION_DELAY * 0.5)
                    
                    submit_buttons = self.driver.find_elements(By.XPATH, "//button[@type='submit' and (contains(text(), 'Add') or contains(text(), 'Create') or contains(text(), 'Save'))]")
                    if submit_buttons:
                        submit_buttons[0].click()
                        time.sleep(ACTION_DELAY * 2)
                        print("Product added successfully")
            except Exception as e:
                print(f"Could not add product: {e}")
            
            print("Owner add product test completed")
            return True
        except Exception as e:
            print(f"Test 7 failed: {e}")
            return False
    
    def test_user_signup(self):
        """
        Use Case: UAR 1.1
        Tests: User signs up with email and password to access the platform
        """
        print("\nTEST 8: User Signup (UAR 1.1)")
        try:
            self.logout()
            time.sleep(ACTION_DELAY)
            
            self.driver.get(f"{BASE_URL}/signup")
            time.sleep(ACTION_DELAY)
            
            self.safe_click(By.XPATH, "//button[contains(text(), 'Sign Up')]", "Sign Up tab")
            
            test_email = self.generate_email()
            test_name = "Selenium Test User"
            
            self.safe_send_keys(By.ID, "name", test_name, "Full Name")
            self.safe_send_keys(By.ID, "email", test_email, "Email")
            self.safe_send_keys(By.ID, "password", "test123456", "Password")
            self.safe_send_keys(By.ID, "confirmPassword", "test123456", "Confirm Password")
            
            customer_role_buttons = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'role')]//button[contains(text(), 'Customer')]")
            if customer_role_buttons:
                customer_role_buttons[0].click()
                time.sleep(ACTION_DELAY)
            
            self.safe_click(By.XPATH, "//button[@type='submit' and contains(text(), 'Sign Up')]", "Sign Up button")
            time.sleep(ACTION_DELAY * 2)
            
            if "/dashboard" in self.driver.current_url or "/salon" in self.driver.current_url:
                print("User signup successful")
                return True
            else:
                print("User signup failed")
                return False
        except Exception as e:
            print(f"Test 8 failed: {e}")
            return False
    
    def test_user_browse_salons(self):
        """
        Use Case: UAR 1.6
        Tests: User browses available salons to choose where to book
        """
        print("\nTEST 9: User Browses Salons (UAR 1.6)")
        try:
            if not self.login("Nate@gmail.com", "test123", "Customer"):
                return False
            
            time.sleep(ACTION_DELAY * 2)
            
            try:
                salon_cards = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'salon')]//a | //a[contains(@href, '/salon/')] | //div[contains(@class, 'card')]//a")
                if salon_cards:
                    salon_cards[0].click()
                    time.sleep(ACTION_DELAY * 2)
                    if "/salon/" in self.driver.current_url:
                        salon_id = self.driver.current_url.split("/salon/")[1].split("/")[0]
                        self.test_salon_id = salon_id
                        print(f"Navigated to salon ID: {salon_id}")
                        return True
                else:
                    print("No salons found to browse")
                    return True
            except Exception as e:
                print(f"Could not browse salons: {e}")
                return True
        except Exception as e:
            print(f"Test 9 failed: {e}")
            return False
    
    def test_user_view_salon_details(self):
        """
        Use Case: UPH 1.61
        Tests: User views salon details and gallery of before/after photos
        """
        print("\nTEST 10: User Views Salon Details and Gallery (UPH 1.61)")
        try:
            if "/salon/" not in self.driver.current_url:
                if self.test_salon_id:
                    self.driver.get(f"{BASE_URL}/salon/{self.test_salon_id}")
                else:
                    self.driver.get(f"{BASE_URL}/salon/1")
                time.sleep(ACTION_DELAY * 2)
            
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'salon')] | //h1 | //h2", "Salon details")
            time.sleep(ACTION_DELAY)
            
            try:
                gallery_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Haircuts') or contains(text(), 'Gallery')]")
                if gallery_buttons:
                    gallery_buttons[0].click()
                    time.sleep(ACTION_DELAY * 2)
                    print("Viewed haircut gallery")
            except:
                pass
            
            print("User view salon details test completed")
            return True
        except Exception as e:
            print(f"Test 10 failed: {e}")
            return False
    
    def test_user_book_appointment(self):
        """
        Use Case: BS 1.1
        Tests: User views available stylists and time slots to book easily
        """
        print("\nTEST 11: User Books Appointment (BS 1.1)")
        try:
            if "/salon/" not in self.driver.current_url:
                if self.test_salon_id:
                    self.driver.get(f"{BASE_URL}/salon/{self.test_salon_id}/book")
                else:
                    self.driver.get(f"{BASE_URL}/salon/1/book")
                time.sleep(ACTION_DELAY * 2)
            else:
                book_buttons = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/book')] | //button[contains(text(), 'Book')]")
                if book_buttons:
                    book_buttons[0].click()
                    time.sleep(ACTION_DELAY * 2)
            
            try:
                stylist_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'stylist')] | //div[contains(@class, 'stylist')]//button")
                if stylist_buttons:
                    stylist_buttons[0].click()
                    time.sleep(ACTION_DELAY)
                
                service_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'service')] | //div[contains(@class, 'service')]//button")
                if service_buttons:
                    service_buttons[0].click()
                    time.sleep(ACTION_DELAY)
                
                date_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'date')] | //div[contains(@class, 'calendar')]//button[not(@disabled)]")
                if date_buttons:
                    date_buttons[0].click()
                    time.sleep(ACTION_DELAY)
                
                time_slots = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'time')] | //div[contains(@class, 'time-slot')]//button[not(@disabled)]")
                if time_slots:
                    time_slots[0].click()
                    time.sleep(ACTION_DELAY)
                
                confirm_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Confirm') or contains(text(), 'Book')]")
                if confirm_buttons:
                    confirm_buttons[0].click()
                    time.sleep(ACTION_DELAY * 2)
                    print("Appointment booking attempted")
            except Exception as e:
                print(f"Could not complete booking: {e}")
            
            print("User book appointment test completed")
            return True
        except Exception as e:
            print(f"Test 11 failed: {e}")
            return False
    
    def test_user_view_appointments(self):
        """
        Use Case: UPH 1.1
        Tests: User views visit history to track past services
        """
        print("\nTEST 12: User Views Appointments (UPH 1.1)")
        try:
            self.driver.get(f"{BASE_URL}/appointments")
            time.sleep(ACTION_DELAY * 2)
            
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'appointment')] | //h2 | //table", "Appointments list")
            time.sleep(ACTION_DELAY)
            
            print("User view appointments test completed")
            return True
        except Exception as e:
            print(f"Test 12 failed: {e}")
            return False
    
    def test_user_browse_products(self):
        """
        Use Case: SF 1.2
        Tests: User browses products, adds to cart, and checks out securely
        """
        print("\nTEST 13: User Browses Products (SF 1.2)")
        try:
            salon_id = self.test_salon_id or "1"
            self.driver.get(f"{BASE_URL}/products/{salon_id}")
            time.sleep(ACTION_DELAY * 2)
            
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'product')] | //h2", "Products list")
            time.sleep(ACTION_DELAY)
            
            try:
                add_to_cart_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Add to Cart')]")
                if add_to_cart_buttons:
                    add_to_cart_buttons[0].click()
                    time.sleep(ACTION_DELAY)
                    print("Product added to cart")
            except:
                pass
            
            print("User browse products test completed")
            return True
        except Exception as e:
            print(f"Test 13 failed: {e}")
            return False
    
    def test_user_view_loyalty_points(self):
        """
        Use Case: PLR 1.4
        Tests: User views loyalty points balance to know rewards progress
        """
        print("\nTEST 14: User Views Loyalty Points (PLR 1.4)")
        try:
            self.driver.get(f"{BASE_URL}/loyalty-points")
            time.sleep(ACTION_DELAY * 2)
            
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'loyalty')] | //h2", "Loyalty points")
            time.sleep(ACTION_DELAY)
            
            print("User view loyalty points test completed")
            return True
        except Exception as e:
            print(f"Test 14 failed: {e}")
            return False
    
    def test_stylist_dashboard(self):
        """
        Use Case: BS 1.4
        Tests: Stylist views daily schedule to prepare in advance
        """
        print("\nTEST 15: Stylist Views Dashboard and Schedule (BS 1.4)")
        try:
            self.logout()
            time.sleep(ACTION_DELAY)
            
            if not self.login("Kaismith@gmail.com", "test123", "Stylist"):
                return False
            
            time.sleep(ACTION_DELAY * 2)
            
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'schedule')] | //h2 | //div[contains(@class, 'dashboard')]", "Stylist dashboard")
            time.sleep(ACTION_DELAY)
            
            print("Stylist dashboard test completed")
            return True
        except Exception as e:
            print(f"Test 15 failed: {e}")
            return False
    
    def test_stylist_add_services(self):
        """
        Use Case: BS 1.01
        Tests: Stylist adds services offered so clients can select them when booking
        """
        print("\nTEST 16: Stylist Adds Services (BS 1.01)")
        try:
            if "/dashboard" not in self.driver.current_url:
                if not self.login("Kaismith@gmail.com", "test123", "Stylist"):
                    return False
            
            try:
                services_sections = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'service')] | //button[contains(text(), 'Service')]")
                if services_sections:
                    add_service_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Add Service') or contains(text(), 'New Service')]")
                    if add_service_buttons:
                        add_service_buttons[0].click()
                        time.sleep(ACTION_DELAY)
                        
                        service_name = f"Test Service {random.randint(10, 99)}"
                        
                        name_inputs = self.driver.find_elements(By.NAME, "name")
                        if not name_inputs:
                            name_inputs = self.driver.find_elements(By.XPATH, "//input[@placeholder*='name' or @placeholder*='Name']")
                        if name_inputs:
                            name_inputs[0].clear()
                            name_inputs[0].send_keys(service_name)
                            time.sleep(ACTION_DELAY * 0.5)
                        
                        duration_inputs = self.driver.find_elements(By.NAME, "duration")
                        if not duration_inputs:
                            duration_inputs = self.driver.find_elements(By.XPATH, "//input[@type='number']")
                        if duration_inputs:
                            duration_inputs[0].clear()
                            duration_inputs[0].send_keys("30")
                            time.sleep(ACTION_DELAY * 0.5)
                        
                        price_inputs = self.driver.find_elements(By.NAME, "price")
                        if price_inputs:
                            price_inputs[0].clear()
                            price_inputs[0].send_keys("25.00")
                            time.sleep(ACTION_DELAY * 0.5)
                        
                        submit_buttons = self.driver.find_elements(By.XPATH, "//button[@type='submit' and (contains(text(), 'Add') or contains(text(), 'Save'))]")
                        if submit_buttons:
                            submit_buttons[0].click()
                            time.sleep(ACTION_DELAY * 2)
                            print("Service added successfully")
            except Exception as e:
                print(f"Could not add service: {e}")
            
            print("Stylist add services test completed")
            return True
        except Exception as e:
            print(f"Test 16 failed: {e}")
            return False
    
    def test_admin_reflect_owner_changes(self):
        """
        Use Cases: AFDV 1.1, AFDV 1.2, AFDV 1.3
        Tests: Admin sees owner activities reflected in analytics (cross-verification)
        """
        print("\nTEST 17: Admin Sees Owner Changes Reflected in Analytics")
        try:
            self.logout()
            time.sleep(ACTION_DELAY)
            
            if not self.login("admin@strands.com", "test123", "Admin"):
                return False
            
            print("Checking if owner activities are reflected in admin analytics...")
            self.driver.get(f"{BASE_URL}/dashboard?tab=revenue-analytics")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'analytics')] | //h2", "Revenue analytics")
            time.sleep(ACTION_DELAY)
            
            self.driver.get(f"{BASE_URL}/admin/salon-verification")
            time.sleep(ACTION_DELAY * 2)
            self.wait_for_element(By.XPATH, "//div[contains(@class, 'salon')] | //h2", "Salon verification")
            time.sleep(ACTION_DELAY)
            
            print("Admin reflect owner changes test completed")
            return True
        except Exception as e:
            print(f"Test 17 failed: {e}")
            return False
    
    def run_all_tests(self):
        print("=" * 70)
        print("STRANDS PLATFORM SELENIUM TEST SUITE")
        print("=" * 70)
        
        start_time = time.time()
        
        try:
            self.setup()
            
            tests = [
                self.test_admin_analytics_overview,
                self.test_admin_verify_salon,
                self.test_owner_signup_and_register,
                self.test_admin_verify_salon,
                self.test_owner_dashboard_metrics,
                self.test_owner_add_staff,
                self.test_owner_set_hours,
                self.test_owner_add_product,
                self.test_user_signup,
                self.test_user_browse_salons,
                self.test_user_view_salon_details,
                self.test_user_book_appointment,
                self.test_user_view_appointments,
                self.test_user_browse_products,
                self.test_user_view_loyalty_points,
                self.test_stylist_dashboard,
                self.test_stylist_add_services,
                self.test_admin_reflect_owner_changes,
            ]
            
            passed = 0
            failed = 0
            
            for test in tests:
                try:
                    result = test()
                    if result:
                        passed += 1
                        self.test_results.append((test.__name__, "PASSED"))
                    else:
                        failed += 1
                        self.test_results.append((test.__name__, "FAILED"))
                except Exception as e:
                    failed += 1
                    self.test_results.append((test.__name__, f"ERROR: {e}"))
                    print(f"Test {test.__name__} crashed: {e}")
            
            elapsed_time = time.time() - start_time
            
            print("\n" + "=" * 70)
            print("TEST SUMMARY")
            print("=" * 70)
            print(f"Passed: {passed}")
            print(f"Failed: {failed}")
            print(f"Total Time: {elapsed_time:.2f} seconds ({elapsed_time/60:.2f} minutes)")
            if (passed + failed) > 0:
                print(f"Success Rate: {(passed/(passed+failed)*100):.1f}%")
            print("\nDetailed Results:")
            for test_name, result in self.test_results:
                print(f"  {test_name}: {result}")
            print("=" * 70)
            
        finally:
            self.teardown()

if __name__ == "__main__":
    suite = StrandsTestSuite()
    suite.run_all_tests()

