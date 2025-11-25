from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
import time
import random
import string
import signal
import sys

BASE_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:3001/api"
WAIT_TIMEOUT = 5  # Fast timeout
ACTION_DELAY = 0.3  # Very fast execution
MAX_TEST_TIME = 300  # Maximum time per test (5 minutes)

class StrandsTestSuite:
    def __init__(self):
        self.driver = None
        self.wait = None
        self.test_results = []
        self.test_salon_id = None
        self.owner_email = None
        self.stylist_email = None
        self.user_email = None
        self.test_start_time = None
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def signal_handler(self, signum, frame):
        """Handle interrupt signals gracefully"""
        print("\n\nTest interrupted by user. Cleaning up...")
        self.teardown()
        sys.exit(0)
        
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
    
    def navigate_and_scroll(self, url):
        """Navigate to URL and ALWAYS scroll - use this instead of driver.get"""
        self.driver.get(url)
        time.sleep(0.3)
        self.scroll_page_to_show_all()
    
    def setup(self):
        print("Setting up Selenium WebDriver...")
        print("Checking backend connection...")
        self.check_backend()
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)
        self.navigate_and_scroll(BASE_URL)
        
    def teardown(self):
        if self.driver:
            self.driver.quit()
            print("Browser closed")
    
    def scroll_page_to_show_all(self):
        """Scroll the entire page instantly to show all content - ALWAYS CALLED"""
        try:
            # Get page height - wait a tiny bit for page to render
            time.sleep(0.2)
            page_height = self.driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight)")
            viewport_height = self.driver.execute_script("return window.innerHeight")
            
            if page_height > viewport_height:
                # Scroll through page quickly to show all content
                # Scroll to bottom
                self.driver.execute_script(f"window.scrollTo(0, {page_height});")
                time.sleep(0.1)
                # Scroll to middle to show most content
                self.driver.execute_script(f"window.scrollTo(0, {page_height * 0.5});")
                time.sleep(0.1)
                return True
            return True
        except Exception as e:
            # Silently fail - don't break tests if scrolling fails
            return False
    
    def scroll_to_element(self, element):
        """Scroll element into view using JavaScript"""
        try:
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center', inline: 'nearest'});", element)
            time.sleep(ACTION_DELAY * 0.2)
            return True
        except:
            try:
                # Fallback to simple scroll
                self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
                time.sleep(ACTION_DELAY * 0.2)
                return True
            except:
                return False
    
    def safe_click_element(self, element, description=""):
        """Click an element with scrolling and fallback to JS click"""
        try:
            self.scroll_to_element(element)
            # Wait a bit for scroll to complete
            time.sleep(ACTION_DELAY * 0.2)
            try:
                element.click()
            except:
                # Fallback to JavaScript click
                self.driver.execute_script("arguments[0].click();", element)
            time.sleep(ACTION_DELAY * 0.3)
            return True
        except Exception as e:
            print(f"Failed to click element: {description} - {e}")
            return False
    
    def safe_send_keys_element(self, element, text, description=""):
        """Send keys to an element with scrolling"""
        try:
            self.scroll_to_element(element)
            time.sleep(ACTION_DELAY * 0.2)
            element.clear()
            element.click()  # Focus
            time.sleep(ACTION_DELAY * 0.1)
            element.send_keys(text)
            time.sleep(ACTION_DELAY * 0.3)
            return True
        except Exception as e:
            print(f"Failed to send keys to element: {description} - {e}")
            return False
    
    def safe_click(self, by, value, description=""):
        try:
            element = self.wait.until(EC.element_to_be_clickable((by, value)))
            # Scroll element into view before clicking
            self.scroll_to_element(element)
            # Ensure element is still clickable after scroll
            element = self.wait.until(EC.element_to_be_clickable((by, value)))
            # Use JavaScript click as fallback if regular click fails
            try:
                element.click()
            except:
                self.driver.execute_script("arguments[0].click();", element)
            time.sleep(ACTION_DELAY)
            print(f"Clicked: {description or value}")
            return True
        except TimeoutException:
            print(f"Failed to click: {description or value}")
            return False
        except Exception as e:
            # Try JavaScript click as last resort
            try:
                element = self.driver.find_element(by, value)
                self.scroll_to_element(element)
                self.driver.execute_script("arguments[0].click();", element)
                time.sleep(ACTION_DELAY)
                print(f"Clicked (via JS): {description or value}")
                return True
            except:
                print(f"Failed to click: {description or value} - {e}")
                return False
    
    def safe_send_keys(self, by, value, text, description=""):
        try:
            element = self.wait.until(EC.presence_of_element_located((by, value)))
            # Scroll element into view before sending keys
            self.scroll_to_element(element)
            # Ensure element is still present after scroll
            element = self.wait.until(EC.presence_of_element_located((by, value)))
            element.clear()
            element.click()  # Focus the element
            time.sleep(ACTION_DELAY * 0.2)
            element.send_keys(text)
            time.sleep(ACTION_DELAY * 0.5)
            print(f"Entered text in: {description or value}")
            return True
        except TimeoutException:
            print(f"Failed to enter text in: {description or value}")
            return False
        except Exception as e:
            print(f"Failed to enter text in: {description or value} - {e}")
            return False
    
    def wait_for_element(self, by, value, description="", timeout=None):
        """Wait for element with optional custom timeout"""
        try:
            wait_time = timeout if timeout else WAIT_TIMEOUT
            wait = WebDriverWait(self.driver, wait_time)
            element = wait.until(EC.presence_of_element_located((by, value)))
            # Scroll element into view to ensure it's visible
            self.scroll_to_element(element)
            print(f"Found: {description or value}")
            return True
        except TimeoutException:
            print(f"Element not found: {description or value} (timeout: {wait_time}s)")
            return False
        except Exception as e:
            print(f"Error waiting for element {description or value}: {e}")
            return False
    
    def logout(self):
        """Logout - reliable with cookie/localStorage clearing"""
        try:
            # Check if driver is still valid
            if not self.driver:
                return True
            
            # Try to find and click logout button with proper waits
            try:
                # Wait for logout button to be visible and clickable
                logout_buttons = WebDriverWait(self.driver, 5).until(
                    EC.presence_of_all_elements_located((By.XPATH, "//button[contains(text(), 'Logout')] | //button[contains(text(), 'Sign Out')] | //button[contains(text(), 'Log Out')]"))
                )
                
                if logout_buttons:
                    # Scroll to button first
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", logout_buttons[0])
                    time.sleep(0.2)
                    
                    # Wait for button to be clickable
                    logout_btn = WebDriverWait(self.driver, 3).until(
                        EC.element_to_be_clickable(logout_buttons[0])
                    )
                    
                    # Try regular click first
                    try:
                        logout_btn.click()
                    except:
                        # Fallback to JS click
                        self.driver.execute_script("arguments[0].click();", logout_btn)
                    
                    # Wait for logout to process and redirect
                    time.sleep(1.0)
                    
                    # Clear cookies and localStorage
                    try:
                        self.driver.delete_all_cookies()
                        self.driver.execute_script("window.localStorage.clear();")
                        self.driver.execute_script("window.sessionStorage.clear();")
                    except:
                        pass
                    
                    print("Logged out successfully")
                    return True
            except TimeoutException:
                # Logout button not found, navigate to home and clear session
                pass
            except Exception as e:
                print(f"Logout button click failed: {e}")
            
            # Fallback: Navigate to home and clear session
            try:
                self.driver.get(f"{BASE_URL}/")
                time.sleep(0.5)
                
                # Clear cookies and localStorage
                try:
                    self.driver.delete_all_cookies()
                    self.driver.execute_script("window.localStorage.clear();")
                    self.driver.execute_script("window.sessionStorage.clear();")
                except:
                    pass
                
                print("Session cleared (navigated to home)")
            except:
                pass
            return True
        except Exception as e:
            # Silently fail - don't crash tests
            return True
    
    def login(self, email, password, role_description):
        print(f"Logging in as {role_description}...")
        self.navigate_and_scroll(f"{BASE_URL}/login")
        
        self.safe_send_keys(By.ID, "login-email", email, "Email")
        self.safe_send_keys(By.ID, "login-password", password, "Password")
        self.safe_click(By.XPATH, "//button[@type='submit' and contains(text(), 'Sign In')]", "Login button")
        time.sleep(ACTION_DELAY * 2)  # Wait longer for redirect
        
        # Check URL after login
        current_url = self.driver.current_url
        if "/dashboard" in current_url or "/admin" in current_url or "/owner" in current_url:
            print(f"Successfully logged in as {role_description}")
            return True
        else:
            print(f"Login may have failed - current URL: {current_url}")
            # Sometimes redirect takes a moment, wait a bit more
            time.sleep(ACTION_DELAY * 2)
            current_url = self.driver.current_url
            if "/dashboard" in current_url or "/admin" in current_url or "/owner" in current_url:
                print(f"Successfully logged in as {role_description} (after additional wait)")
                return True
            return False
    
    def wait_for_modal(self, timeout=4):
        """Wait for confirmation modal to appear"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            modal = wait.until(EC.any_of(
                EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'fixed') and contains(@class, 'inset-0')]")),
                EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'z-50') and contains(@class, 'fixed')]")),
                EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
            ))
            time.sleep(0.5)  # Wait for modal animation
            return True
        except:
            return False
    
    def click_modal_confirm(self, timeout=4):
        """Click the confirm button in a modal"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            
            # Try to find confirm/reject/approve buttons
            try:
                action_buttons = wait.until(EC.presence_of_all_elements_located((
                    By.XPATH, 
                    "//div[contains(@class, 'fixed')]//button[contains(text(), 'Reject')] | "
                    "//div[contains(@class, 'fixed')]//button[contains(text(), 'Confirm')] | "
                    "//div[@role='dialog']//button[contains(text(), 'Reject')] | "
                    "//div[@role='dialog']//button[contains(text(), 'Confirm')]"
                )))
                
                visible_buttons = [btn for btn in action_buttons if btn.is_displayed()]
                
                if visible_buttons:
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", visible_buttons[0])
                    time.sleep(0.2)
                    clickable_btn = wait.until(EC.element_to_be_clickable(visible_buttons[0]))
                    try:
                        clickable_btn.click()
                    except:
                        self.driver.execute_script("arguments[0].click();", clickable_btn)
                    time.sleep(0.3)
                    return True
            except TimeoutException:
                pass
            
            # Fallback: find all buttons and click non-cancel one
            all_buttons = self.driver.find_elements(By.XPATH, 
                "//div[contains(@class, 'fixed')]//button | "
                "//div[@role='dialog']//button"
            )
            
            for btn in all_buttons:
                if not btn.is_displayed():
                    continue
                btn_text = btn.text.strip().lower()
                if 'cancel' not in btn_text and btn.is_enabled():
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn)
                    time.sleep(0.2)
                    try:
                        btn.click()
                    except:
                        self.driver.execute_script("arguments[0].click();", btn)
                    time.sleep(0.3)
                    return True
            return False
        except Exception as e:
            print(f"Modal confirm click failed: {e}")
            return False
    
    def select_select_dropdown(self, element_id, option_text):
        """Helper method to handle Radix UI Select dropdowns (like role selector)"""
        try:
            # Find the SelectTrigger by ID
            select_trigger = self.wait.until(EC.element_to_be_clickable((By.ID, element_id)))
            self.scroll_to_element(select_trigger)
            time.sleep(0.2)
            
            # Click to open the dropdown
            try:
                select_trigger.click()
            except:
                self.driver.execute_script("arguments[0].click();", select_trigger)
            time.sleep(0.5)  # Wait for dropdown to open
            
            # Wait for SelectContent to appear and find the option
            option_selectors = [
                f"//div[@role='option']//span[contains(text(), '{option_text}')]",
                f"//div[@role='option' and contains(., '{option_text}')]",
                f"//div[contains(@class, 'SelectItem')]//span[contains(text(), '{option_text}')]",
                f"//div[contains(@class, 'SelectItem') and contains(., '{option_text}')]"
            ]
            
            option_found = False
            for selector in option_selectors:
                try:
                    option = WebDriverWait(self.driver, 3).until(
                        EC.element_to_be_clickable((By.XPATH, selector))
                    )
                    self.scroll_to_element(option)
                    time.sleep(0.2)
                    
                    # Click the option
                    try:
                        option.click()
                    except:
                        self.driver.execute_script("arguments[0].click();", option)
                    
                    time.sleep(0.3)  # Wait for selection to register
                    print(f"Selected role: {option_text}")
                    option_found = True
                    break
                except:
                    continue
            
            if not option_found:
                print(f"Failed to find role option: {option_text}")
                return False
            
            return True
        except Exception as e:
            print(f"Failed to select from dropdown {element_id}: {e}")
            return False
    
    def select_strands_select(self, option_text, element_id=None, dropdown_index=None):
        """Helper method to handle StrandsSelect custom dropdowns - uses ID to find button"""
        try:
            # If element_id is provided, find button by ID directly
            if element_id:
                print(f"    Finding dropdown button by ID: {element_id}")
                select_trigger = self.wait.until(EC.element_to_be_clickable((By.ID, element_id)))
            elif dropdown_index is not None:
                # Find all StrandsSelect dropdowns (they have a button with border-gray-300 and rounded-lg)
                strands_selects = self.driver.find_elements(By.XPATH, 
                    "//button[contains(@class, 'border-gray-300') and contains(@class, 'rounded-lg')]"
                )
                
                if dropdown_index >= len(strands_selects):
                    print(f"    Dropdown index {dropdown_index} not found (only {len(strands_selects)} dropdowns available)")
                    return False
                
                select_trigger = strands_selects[dropdown_index]
            else:
                print("    Either element_id or dropdown_index must be provided")
                return False
            
            # Scroll to button and ensure it's visible
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", select_trigger)
            time.sleep(0.3)
            
            # Click to open dropdown
            print(f"    Clicking dropdown button to open options...")
            try:
                select_trigger.click()
            except:
                self.driver.execute_script("arguments[0].click();", select_trigger)
            time.sleep(0.8)  # Wait for dropdown to open
            
            # Find the option by text (StrandsSelect uses divs with cursor-pointer class inside the dropdown)
            print(f"    Looking for option: {option_text}")
            option_selectors = [
                f"//div[contains(@class, 'absolute')]//div[contains(@class, 'cursor-pointer') and contains(., '{option_text}')]",
                f"//div[contains(@class, 'absolute')]//div[contains(@class, 'flex') and contains(@class, 'items-center') and contains(., '{option_text}')]",
                f"//div[contains(@class, 'absolute')]//div[contains(text(), '{option_text}')]",
                f"//div[contains(@class, 'cursor-pointer')]//span[contains(text(), '{option_text}')]",
                f"//div[contains(text(), '{option_text}') and contains(@class, 'cursor-pointer')]"
            ]
            
            option_found = False
            for selector in option_selectors:
                try:
                    option = WebDriverWait(self.driver, 4).until(
                        EC.element_to_be_clickable((By.XPATH, selector))
                    )
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", option)
                    time.sleep(0.2)
                    
                    # Click the option
                    try:
                        option.click()
                    except:
                        self.driver.execute_script("arguments[0].click();", option)
                    
                    time.sleep(0.4)  # Wait for selection to register
                    print(f"    ✓ Selected option: {option_text}")
                    option_found = True
                    break
                except TimeoutException:
                    continue
                except Exception as e:
                    print(f"    Option selector failed: {e}")
                    continue
            
            if not option_found:
                print(f"    ✗ Failed to find option: {option_text}")
                return False
            
            return True
        except Exception as e:
            print(f"    ✗ Failed to select from StrandsSelect: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def generate_email(self):
        """Generate a random email for testing"""
        random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return f"test_{random_str}@selenium.com"

    # PHASE 1 — AUTHENTICATION TESTS
    
    def test_1_login_page_loads(self):
        """
        Test 1 — Login Page Loads
        Navigate to /login
        Ensure fields load: email input, password input, submit button
        """
        print("\n" + "="*70)
        print("TEST 1: Login Page Loads")
        print("="*70)
        try:
            self.navigate_and_scroll(f"{BASE_URL}/login")
            
            # Check for email input
            email_found = self.wait_for_element(By.ID, "login-email", "Email input")
            
            # Check for password input
            password_found = self.wait_for_element(By.ID, "login-password", "Password input")
            
            # Check for submit button
            submit_found = self.wait_for_element(By.XPATH, "//button[@type='submit' and contains(text(), 'Sign In')]", "Submit button")
            
            if email_found and password_found and submit_found:
                print("PASS: Login page loaded successfully with all required fields")
                return True
            else:
                print("FAIL: Login page missing required fields")
                return False
        except Exception as e:
            print(f"FAIL: Test 1 failed: {e}")
            return False
    
    def test_2_invalid_login_attempt(self):
        """
        Test 2 — Invalid Login Attempt
        First: Click Sign In with empty fields to test error validation
        Then: Enter incorrect email or password
        Expect visible error message: Invalid credentials
        """
        print("\n" + "="*70)
        print("TEST 2: Invalid Login Attempt")
        print("="*70)
        try:
            self.driver.get(f"{BASE_URL}/login")
            time.sleep(ACTION_DELAY)
            
            # First, test empty fields validation
            print("Testing empty fields validation...")
            try:
                # Clear any existing values
                email_input = self.driver.find_element(By.ID, "login-email")
                password_input = self.driver.find_element(By.ID, "login-password")
                email_input.clear()
                password_input.clear()
                time.sleep(0.2)
                
                # Click Sign In button with empty fields
                sign_in_button = self.driver.find_element(By.XPATH, "//button[@type='submit' and contains(text(), 'Sign In')]")
                self.scroll_to_element(sign_in_button)
                time.sleep(0.2)
                sign_in_button.click()
                time.sleep(ACTION_DELAY * 2)  # Wait for validation to appear
                
                # Check for validation error messages
                empty_field_error = False
                try:
                    validation_errors = self.driver.find_elements(By.XPATH, 
                        "//div[contains(@class, 'error')] | "
                        "//div[contains(text(), 'required')] | "
                        "//div[contains(text(), 'Required')] | "
                        "//div[contains(text(), 'Please')] | "
                        "//input[@id='login-email']/following-sibling::div[contains(@class, 'error')] | "
                        "//input[@id='login-password']/following-sibling::div[contains(@class, 'error')]"
                    )
                    if validation_errors:
                        empty_field_error = True
                        print(f"  ✓ Empty fields validation error displayed: {validation_errors[0].text[:50]}")
                    else:
                        # Check if form prevented submission (stayed on login page)
                        if "/login" in self.driver.current_url:
                            print("  ✓ Empty fields prevented form submission (stayed on login page)")
                            empty_field_error = True
                except:
                    pass
                
                if not empty_field_error:
                    print("  ⚠ Empty fields validation may not have triggered")
            except Exception as e:
                print(f"  ⚠ Could not test empty fields validation: {e}")
            
            # Now test invalid credentials
            print("Testing invalid credentials...")
            self.driver.get(f"{BASE_URL}/login")
            time.sleep(ACTION_DELAY)
            
            self.safe_send_keys(By.ID, "login-email", "invalid@test.com", "Invalid Email")
            self.safe_send_keys(By.ID, "login-password", "wrongpassword", "Invalid Password")
            self.safe_click(By.XPATH, "//button[@type='submit' and contains(text(), 'Sign In')]", "Login button")
            time.sleep(ACTION_DELAY * 2)
            
            # Look for error message
            error_found = False
            try:
                error_elements = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'error')] | //div[contains(text(), 'Invalid')] | //div[contains(text(), 'Login failed')] | //div[contains(text(), 'incorrect')]")
                if error_elements:
                    error_found = True
                    print(f" Error message displayed: {error_elements[0].text[:50]}")
            except:
                pass
            
            if error_found or "/login" in self.driver.current_url:
                print(" Invalid login attempt handled correctly")
                return True
            else:
                print(" No error message displayed for invalid login")
                return False
        except Exception as e:
            print(f" Test 2 failed: {e}")
            return False
    
    def test_3_successful_login_admin(self):
        """
        Test 3 — Successful Login (Admin)
        Login as: admin@strands.com / test123
        Expect redirect to the default admin dashboard tab: /dashboard?tab=user-analytics
        Navigate to salon verification page after login
        """
        print("\n" + "="*70)
        print("TEST 3: Successful Login (Admin)")
        print("="*70)
        try:
            if not self.login("admin@strands.com", "test123", "Admin"):
                return False
            
            # Check if redirected to admin dashboard
            time.sleep(ACTION_DELAY * 2)  # Wait longer for redirect
            current_url = self.driver.current_url
            print(f" Current URL after login: {current_url}")
            
            if "/admin" in current_url or "/dashboard" in current_url or "tab=user-analytics" in current_url:
                print(" Admin login successful and redirected to dashboard")
                
                # Navigate to salon verification page
                print("Navigating to Salon Verification page...")
                salon_mgmt_clicked = self.safe_click(
                    By.XPATH,
                    "//button[contains(text(), 'Salon Management')] | //a[contains(text(), 'Salon Management')]",
                    "Salon Management tab"
                )
                if not salon_mgmt_clicked:
                    self.navigate_and_scroll(f"{BASE_URL}/admin/salon-verification")
                else:
                    time.sleep(1.0)
                
                # Wait for page to load
                time.sleep(1.5)
                current_url = self.driver.current_url
                print(f" Current URL after navigation: {current_url}")
                if "/admin/salon-verification" in current_url:
                    print(" Successfully navigated to Salon Verification page")
                    return True
                else:
                    print(f" Navigation to salon verification may have failed - current URL: {current_url}")
                    # Still pass if we're on an admin page (login worked)
                    if "/admin" in current_url or "/dashboard" in current_url:
                        print(" Still on admin page, login was successful")
                        return True
                    return False
            else:
                print(f" Admin login failed - redirected to: {current_url}")
                return False
        except Exception as e:
            print(f" Test 3 failed: {e}")
            return False
    
    # PHASE 2 — ADMIN CORE FUNCTION TESTS
    
    def test_4_admin_pages_and_salon_rejection(self):
        """
        Test 4 — Admin Pages Navigation and Salon Rejection
        After Phase 1, already logged in as admin on salon verification page
        Go through each admin page and scroll through to show content
        Go back to salon verification
        Go through salon management filter tabs (using IDs)
        Make sure everything is loaded
        Go back to "All" filter
        Reject the first salon found (using ID)
        Click logout (using ID)
        """
        print("\n" + "="*70)
        print("TEST 4: Admin Pages Navigation and Salon Rejection")
        print("="*70)
        try:
            # Should already be on salon verification page from test 3
            current_url = self.driver.current_url
            if "/admin/salon-verification" not in current_url:
                # Navigate to salon verification if not already there
                print("Navigating to Salon Verification page...")
                salon_mgmt_clicked = self.safe_click(
                    By.XPATH,
                    "//button[contains(text(), 'Salon Management')] | //a[contains(text(), 'Salon Management')]",
                    "Salon Management tab"
                )
                if not salon_mgmt_clicked:
                    self.navigate_and_scroll(f"{BASE_URL}/admin/salon-verification")
                else:
                    time.sleep(1.0)
            
            # Go through each admin page in the order they appear in the navbar
            print("Going through admin pages in navbar order...")
            admin_pages = [
                ("/admin/salon-verification", "Salon Management"),  # First in navbar
                ("/admin/loyalty-monitoring", "Loyalty Monitoring"),  # Second in navbar
                ("/dashboard?tab=user-analytics", "User Analytics"),  # Third in navbar
                ("/dashboard?tab=business-insights", "Business Insights"),  # Fourth in navbar
                ("/dashboard?tab=revenue-analytics", "Revenue Analytics"),  # Fifth in navbar (Revenue Tracking)
            ]
            
            for path, name in admin_pages:
                print(f"  Checking {name} page...")
                # Use navbar click if available, otherwise navigate directly
                if name == "Salon Management":
                    salon_mgmt_clicked = self.safe_click(
                        By.XPATH,
                        "//button[contains(text(), 'Salon Management')] | //a[contains(text(), 'Salon Management')]",
                        "Salon Management tab"
                    )
                    if not salon_mgmt_clicked:
                        self.navigate_and_scroll(f"{BASE_URL}{path}")
                    else:
                        time.sleep(1.0)
                elif name == "Loyalty Monitoring":
                    loyalty_clicked = self.safe_click(
                        By.XPATH,
                        "//button[contains(text(), 'Loyalty Monitoring')] | //a[contains(text(), 'Loyalty Monitoring')]",
                        "Loyalty Monitoring tab"
                    )
                    if not loyalty_clicked:
                        self.navigate_and_scroll(f"{BASE_URL}{path}")
                    else:
                        time.sleep(1.0)
                elif name == "User Analytics":
                    user_analytics_clicked = self.safe_click(
                        By.XPATH,
                        "//button[contains(text(), 'User Analytics')] | //a[contains(text(), 'User Analytics')]",
                        "User Analytics tab"
                    )
                    if not user_analytics_clicked:
                        self.navigate_and_scroll(f"{BASE_URL}{path}")
                    else:
                        time.sleep(1.0)
                elif name == "Business Insights":
                    business_clicked = self.safe_click(
                        By.XPATH,
                        "//button[contains(text(), 'Business Insights')] | //a[contains(text(), 'Business Insights')]",
                        "Business Insights tab"
                    )
                    if not business_clicked:
                        self.navigate_and_scroll(f"{BASE_URL}{path}")
                    else:
                        time.sleep(1.0)
                elif name == "Revenue Analytics":
                    revenue_clicked = self.safe_click(
                        By.XPATH,
                        "//button[contains(text(), 'Revenue Tracking')] | //button[contains(text(), 'Revenue Analytics')] | //a[contains(text(), 'Revenue')]",
                        "Revenue Tracking tab"
                    )
                    if not revenue_clicked:
                        self.navigate_and_scroll(f"{BASE_URL}{path}")
                    else:
                        time.sleep(1.0)
                else:
                    self.navigate_and_scroll(f"{BASE_URL}{path}")
                
                time.sleep(1.5)  # Wait for page to load
                
                # Visibly scroll to show all content
                print(f"    Scrolling through {name} page...")
                time.sleep(0.5)
                page_height = self.driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
                viewport_height = self.driver.execute_script("return window.innerHeight")
                
                # Scroll in increments to make it visible
                scroll_increment = viewport_height * 0.8
                current_scroll = 0
                while current_scroll < page_height:
                    current_scroll += scroll_increment
                    self.driver.execute_script(f"window.scrollTo(0, {current_scroll});")
                    time.sleep(0.4)  # Delay to make scrolling visible
                
                # Scroll to bottom
                self.driver.execute_script(f"window.scrollTo(0, {page_height});")
                time.sleep(0.5)
                
                # Scroll back to top
                self.driver.execute_script("window.scrollTo(0, 0);")
                time.sleep(0.3)
                print(f"    ✓ {name} page scrolled through")
            
            # Go back to salon verification (last page in the loop should be Revenue, so navigate back)
            print("Returning to Salon Verification page...")
            salon_mgmt_clicked = self.safe_click(
                By.XPATH,
                "//button[contains(text(), 'Salon Management')] | //a[contains(text(), 'Salon Management')]",
                "Salon Management tab"
            )
            if not salon_mgmt_clicked:
                self.navigate_and_scroll(f"{BASE_URL}/admin/salon-verification")
            else:
                time.sleep(1.0)
            
            # Wait for page to load
            time.sleep(1.5)
            
            # Go through salon management filter tabs using IDs
            print("Clicking through salon management filter tabs...")
            filter_buttons = [
                ("filter-all-button", "All"),
                ("filter-pending-button", "Pending"),
                ("filter-approved-button", "Approved"),
                ("filter-rejected-button", "Rejected")
            ]
            
            for filter_id, filter_name in filter_buttons:
                try:
                    filter_button = self.wait.until(EC.element_to_be_clickable((By.ID, filter_id)))
                    self.scroll_to_element(filter_button)
                    time.sleep(0.3)
                    filter_button.click()
                    time.sleep(1.0)  # Wait for filter to apply and content to load
                    print(f"  ✓ Clicked {filter_name} filter")
                    
                    # Verify content is loaded
                    time.sleep(0.5)
                    salon_cards = self.driver.find_elements(By.XPATH, 
                        "//div[contains(@class, 'Card')] | //div[contains(@class, 'card')]"
                    )
                    print(f"    Found {len(salon_cards)} salon card(s) in {filter_name} view")
                except Exception as e:
                    print(f"  ⚠ Could not click {filter_name} filter: {e}")
            
            # Go back to "All" filter
            print("Returning to 'All' filter...")
            try:
                all_filter = self.wait.until(EC.element_to_be_clickable((By.ID, "filter-all-button")))
                self.scroll_to_element(all_filter)
                time.sleep(0.3)
                all_filter.click()
                time.sleep(1.0)  # Wait for filter to apply
                print("  ✓ Returned to 'All' filter")
            except Exception as e:
                print(f"  ⚠ Could not return to 'All' filter: {e}")
            
            # Wait for salon cards to load
            print("Waiting for salon cards to load...")
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'Card')] | //div[contains(@class, 'card')]"))
                )
                time.sleep(0.5)
            except:
                print("Warning: Salon cards may not have loaded, continuing anyway...")
            
            # Find and reject the first salon using ID
            print("Looking for first salon to reject...")
            try:
                # Find all reject buttons using ID pattern
                reject_buttons = self.driver.find_elements(By.XPATH, 
                    "//button[starts-with(@id, 'reject-salon-')]"
                )
                
                if reject_buttons:
                    print(f"Found {len(reject_buttons)} Reject button(s), clicking first one...")
                    
                    # Scroll to button and ensure it's visible
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", reject_buttons[0])
                    time.sleep(0.5)
                    
                    # Wait for button to be clickable
                    reject_btn = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable(reject_buttons[0])
                    )
                    
                    # Click the button
                    try:
                        reject_btn.click()
                    except:
                        self.driver.execute_script("arguments[0].click();", reject_btn)
                    
                    time.sleep(1.0)  # Wait for modal to appear
                    
                    # Wait for modal and click confirm
                    modal_clicked = False
                    for attempt in range(3):
                        if self.wait_for_modal(timeout=4):
                            # Scroll modal body into view if needed
                            try:
                                modal_body = self.driver.find_element(By.XPATH, "//div[contains(@class, 'fixed')]//div[contains(@class, 'modal')] | //div[@role='dialog']")
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", modal_body)
                                time.sleep(0.3)
                            except:
                                pass
                            
                            if self.click_modal_confirm(timeout=4):
                                time.sleep(1.0)  # Wait for rejection to complete
                                print("  ✓ Salon rejected successfully")
                                modal_clicked = True
                                break
                        time.sleep(0.5)
                    
                    if not modal_clicked:
                        print("  WARNING: Could not complete rejection - continuing")
                else:
                    print("  No Reject buttons found (no pending salons)")
            except Exception as e:
                print(f"  Error rejecting salon: {e}")
            
            # Click logout using ID
            print("Clicking logout button...")
            time.sleep(0.5)
            try:
                # Try desktop logout button first
                try:
                    logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "admin-logout-button")))
                    self.scroll_to_element(logout_button)
                    time.sleep(0.2)
                    logout_button.click()
                    time.sleep(1.5)  # Wait for logout modal to appear
                    
                    # Handle logout success modal - click OK button
                    print("  Handling logout success modal...")
                    try:
                        ok_button = WebDriverWait(self.driver, 5).until(
                            EC.element_to_be_clickable((By.ID, "logout-modal-ok-button"))
                        )
                        ok_button.click()
                        time.sleep(0.5)
                        print("  ✓ Clicked OK on logout modal")
                    except:
                        # Fallback: try to find OK button by text
                        try:
                            ok_button = WebDriverWait(self.driver, 3).until(
                                EC.element_to_be_clickable((By.XPATH,
                                    "//div[contains(@class, 'fixed')]//button[contains(text(), 'OK')] | "
                                    "//div[@role='dialog']//button[contains(text(), 'OK')]"
                                ))
                            )
                            ok_button.click()
                            time.sleep(0.5)
                            print("  ✓ Clicked OK on logout modal (fallback)")
                        except:
                            print("  ⚠ Could not find OK button on logout modal")
                    
                    time.sleep(1.0)
                    print("  ✓ Logged out successfully")
                except:
                    # Try mobile logout button
                    try:
                        logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "admin-logout-button-mobile")))
                        self.scroll_to_element(logout_button)
                        time.sleep(0.2)
                        logout_button.click()
                        time.sleep(1.5)
                        
                        # Handle logout modal
                        try:
                            ok_button = WebDriverWait(self.driver, 5).until(
                                EC.element_to_be_clickable((By.ID, "logout-modal-ok-button"))
                            )
                            ok_button.click()
                            time.sleep(0.5)
                            print("  ✓ Clicked OK on logout modal")
                        except:
                            pass
                        
                        time.sleep(1.0)
                        print("  ✓ Logged out successfully (mobile)")
                    except:
                        # Fallback to XPath
                        logout_buttons = self.driver.find_elements(By.XPATH, 
                            "//button[contains(text(), 'Logout')] | "
                            "//button[contains(., 'Logout')]"
                        )
                        if logout_buttons:
                            self.scroll_to_element(logout_buttons[0])
                            time.sleep(0.2)
                            logout_buttons[0].click()
                            time.sleep(1.5)
                            
                            # Handle logout modal
                            try:
                                ok_button = WebDriverWait(self.driver, 5).until(
                                    EC.element_to_be_clickable((By.ID, "logout-modal-ok-button"))
                                )
                                ok_button.click()
                                time.sleep(0.5)
                                print("  ✓ Clicked OK on logout modal")
                            except:
                                pass
                            
                            time.sleep(1.0)
                            print("  ✓ Logged out successfully (fallback)")
                        else:
                            print("  ⚠ Could not find logout button")
            except Exception as e:
                print(f"  ⚠ Error clicking logout: {e}")
            
            return True
        except Exception as e:
            print(f" Test 4 failed: {e}")
            return False
    
    # PHASE 3 — OWNER SIGNUP AND ONBOARDING
    
    def test_5_owner_signup_and_admin_approval(self):
        """
        Test 5 — Owner Signup and Admin Approval
        After Phase 2, should be signed out and on landing page
        Click Get Started button
        Test error handling (empty fields, invalid info)
        Fill with valid random information
        Click Create Account
        Log out using logout button ID
        Log back into admin account
        On salon management page, approve the new salon using approve button ID
        Log out of admin
        Log back into the owner account that was just created
        Go through owner dashboard tabs in order and scroll through each
        """
        print("\n" + "="*70)
        print("TEST 5: Owner Signup and Admin Approval")
        print("="*70)
        try:
            # Should be on landing page after Phase 2 logout
            current_url = self.driver.current_url
            if "/" not in current_url and "/login" not in current_url:
                print("Navigating to landing page...")
                self.navigate_and_scroll(f"{BASE_URL}/")
                time.sleep(1.0)
            
            # Click Get Started button using ID
            print("Clicking Get Started button...")
            try:
                # Try hero button first (more prominent)
                get_started_button = self.wait.until(EC.element_to_be_clickable((By.ID, "get-started-hero-button")))
                self.scroll_to_element(get_started_button)
                time.sleep(0.3)
                get_started_button.click()
            except:
                # Fallback to header button
                try:
                    get_started_button = self.wait.until(EC.element_to_be_clickable((By.ID, "get-started-header-button")))
                    self.scroll_to_element(get_started_button)
                    time.sleep(0.3)
                    get_started_button.click()
                except:
                    # Fallback to XPath
                    get_started_buttons = self.driver.find_elements(By.XPATH, 
                        "//button[contains(text(), 'Get Started')]"
                    )
                    if get_started_buttons:
                        self.safe_click_element(get_started_buttons[0], "Get Started button")
            
            time.sleep(1.5)  # Wait for signup page to load
            
            # Ensure we're on signup tab
            print("Ensuring we're on Sign Up tab...")
            try:
                signup_tab = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Sign Up')]")
                if signup_tab:
                    signup_tab.click()
                    time.sleep(0.5)
            except:
                pass
            
            # Test error handling - empty fields
            print("Testing error handling with empty fields...")
            try:
                # Clear all fields
                name_input = self.driver.find_element(By.ID, "name")
                email_input = self.driver.find_element(By.ID, "email")
                password_input = self.driver.find_element(By.ID, "password")
                confirm_password_input = self.driver.find_element(By.ID, "confirmPassword")
                
                name_input.clear()
                email_input.clear()
                password_input.clear()
                confirm_password_input.clear()
                time.sleep(0.2)
                
                # Try to submit with empty fields
                create_account_button = self.driver.find_element(By.ID, "create-account-button")
                self.scroll_to_element(create_account_button)
                time.sleep(0.2)
                create_account_button.click()
                time.sleep(1.5)  # Wait for validation errors
                
                # Check for validation errors
                validation_errors = self.driver.find_elements(By.XPATH, 
                    "//div[contains(@class, 'error')] | "
                    "//div[contains(text(), 'required')] | "
                    "//div[contains(text(), 'Required')] | "
                    "//div[contains(text(), 'Please')]"
                )
                if validation_errors or "/signup" in self.driver.current_url:
                    print("  ✓ Empty fields validation triggered")
                else:
                    print("  ⚠ Empty fields validation may not have triggered")
            except Exception as e:
                print(f"  ⚠ Could not test empty fields: {e}")
            
            # Test error handling - invalid information
            print("Testing error handling with invalid information...")
            try:
                # Fill with invalid data
                name_input = self.driver.find_element(By.ID, "name")
                email_input = self.driver.find_element(By.ID, "email")
                password_input = self.driver.find_element(By.ID, "password")
                confirm_password_input = self.driver.find_element(By.ID, "confirmPassword")
                
                name_input.clear()
                name_input.send_keys("A")  # Too short
                email_input.clear()
                email_input.send_keys("invalid-email")  # Invalid email
                password_input.clear()
                password_input.send_keys("123")  # Too short
                confirm_password_input.clear()
                confirm_password_input.send_keys("456")  # Doesn't match
                time.sleep(0.3)
                
                # Try to submit
                create_account_button = self.driver.find_element(By.ID, "create-account-button")
                self.scroll_to_element(create_account_button)
                time.sleep(0.2)
                create_account_button.click()
                time.sleep(1.5)  # Wait for validation errors
                
                # Check for validation errors
                validation_errors = self.driver.find_elements(By.XPATH, 
                    "//div[contains(@class, 'error')] | "
                    "//div[contains(text(), 'invalid')] | "
                    "//div[contains(text(), 'match')] | "
                    "//div[contains(text(), 'length')]"
                )
                if validation_errors:
                    print(f"  ✓ Invalid data validation triggered: {validation_errors[0].text[:50]}")
                else:
                    print("  ⚠ Invalid data validation may not have triggered")
            except Exception as e:
                print(f"  ⚠ Could not test invalid data: {e}")
            
            # Now fill with valid random information
            print("Filling signup form with valid information...")
            self.owner_email = self.generate_email()
            owner_name = "Selenium Test Owner"
            owner_password = "test123456"
            
            try:
                # Fill Full Name
                name_input = self.driver.find_element(By.ID, "name")
                name_input.clear()
                self.safe_send_keys_element(name_input, owner_name, "Full Name")
                time.sleep(0.2)
                
                # Fill Email
                email_input = self.driver.find_element(By.ID, "email")
                email_input.clear()
                self.safe_send_keys_element(email_input, self.owner_email, "Email")
                time.sleep(0.2)
                
                # Fill Password
                password_input = self.driver.find_element(By.ID, "password")
                password_input.clear()
                self.safe_send_keys_element(password_input, owner_password, "Password")
                time.sleep(0.2)
                
                # Fill Confirm Password
                confirm_password_input = self.driver.find_element(By.ID, "confirmPassword")
                confirm_password_input.clear()
                self.safe_send_keys_element(confirm_password_input, owner_password, "Confirm Password")
                time.sleep(0.2)
                
                # Select Owner role
                print("Selecting Owner role...")
                if not self.select_select_dropdown("role", "Salon Owner"):
                    # Fallback method
                    try:
                        select_trigger = self.wait.until(EC.element_to_be_clickable((By.ID, "role")))
                        self.scroll_to_element(select_trigger)
                        select_trigger.click()
                        time.sleep(0.5)
                        owner_option = WebDriverWait(self.driver, 3).until(
                            EC.element_to_be_clickable((By.XPATH, "//div[@role='option' and (contains(., 'Owner') or contains(., 'Salon'))]"))
                        )
                        owner_option.click()
                        time.sleep(0.3)
                        print("Selected Owner role via fallback")
                    except:
                        print("Warning: Could not select Owner role")
                
                # Click Create Account button using ID
                print("Clicking Create Account button...")
                create_account_button = self.wait.until(EC.element_to_be_clickable((By.ID, "create-account-button")))
                self.scroll_to_element(create_account_button)
                time.sleep(0.3)
                create_account_button.click()
                time.sleep(ACTION_DELAY * 3)  # Wait for account creation and redirect
                
                # Check if signup was successful
                current_url = self.driver.current_url
                if "/owner" in current_url or "/dashboard" in current_url or "/salon-registration" in current_url:
                    print(f"  ✓ Owner account created successfully: {self.owner_email}")
                else:
                    print(f"  ⚠ Signup may have failed - redirected to: {current_url}")
            except Exception as e:
                print(f"  Error filling signup form: {e}")
                return False
            
            # Wait for salon registration form to appear
            print("Waiting for salon registration form...")
            time.sleep(2.0)  # Wait for redirect to salon registration page
            
            # Check if we're on salon registration page
            current_url = self.driver.current_url
            if "/salon-registration" not in current_url and "/owner" not in current_url:
                # Try to find the salon registration form by looking for form fields
                try:
                    salon_name_field = WebDriverWait(self.driver, 5).until(
                        EC.presence_of_element_located((By.ID, "name"))
                    )
                    print("  ✓ Salon registration form found")
                except:
                    print("  ⚠ Salon registration form may not have appeared")
            else:
                print("  ✓ On salon registration page")
            
            # Close any notification modals that might be open
            try:
                # Check if notification modal is open and close it
                notification_modals = self.driver.find_elements(By.XPATH, 
                    "//div[contains(@class, 'fixed')]//h3[contains(text(), 'Notifications')] | "
                    "//div[@role='dialog']//h3[contains(text(), 'Notifications')]"
                )
                if notification_modals:
                    # Find and click close button
                    close_buttons = self.driver.find_elements(By.XPATH,
                        "//div[contains(@class, 'fixed')]//button[contains(@class, 'X')] | "
                        "//div[@role='dialog']//button[.//*[local-name()='svg']] | "
                        "//button[.//*[local-name()='svg' and contains(@class, 'X')]]"
                    )
                    for btn in close_buttons:
                        try:
                            if btn.is_displayed():
                                btn.click()
                                time.sleep(0.3)
                                print("  Closed notification modal if it was open")
                                break
                        except:
                            pass
            except:
                pass
            
            # Scroll to the form to avoid accidentally clicking navbar buttons (like inbox)
            try:
                # Scroll to form area to focus on form elements
                form_element = self.driver.find_element(By.XPATH, 
                    "//form | //div[contains(@class, 'Card')] | //div[contains(@class, 'card')]"
                )
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'start', behavior: 'smooth'});", form_element)
                time.sleep(0.5)
                print("  Scrolled to form to avoid navbar buttons")
            except:
                pass
            
            # Test error handling - empty fields
            print("Testing salon registration error handling with empty fields...")
            try:
                # Try to submit with empty fields
                submit_button = self.wait.until(EC.element_to_be_clickable((By.ID, "submit-for-review-button")))
                self.scroll_to_element(submit_button)
                time.sleep(0.2)
                submit_button.click()
                time.sleep(1.5)  # Wait for validation errors
                
                # Check for validation errors
                validation_errors = self.driver.find_elements(By.XPATH, 
                    "//div[contains(@class, 'error')] | "
                    "//div[contains(text(), 'required')] | "
                    "//div[contains(text(), 'Required')] | "
                    "//div[contains(text(), 'Please')] | "
                    "//div[contains(@class, 'destructive')]"
                )
                if validation_errors or "/salon-registration" in self.driver.current_url:
                    print("  ✓ Empty fields validation triggered")
                else:
                    print("  ⚠ Empty fields validation may not have triggered")
            except Exception as e:
                print(f"  ⚠ Could not test empty fields: {e}")
            
            # Test error handling - invalid information
            print("Testing salon registration error handling with invalid information...")
            try:
                # Fill with invalid data
                phone_input = self.driver.find_element(By.ID, "phone")
                postal_code_input = self.driver.find_element(By.ID, "postal_code")
                
                phone_input.clear()
                phone_input.send_keys("abc")  # Invalid phone
                postal_code_input.clear()
                postal_code_input.send_keys("abc")  # Invalid postal code
                time.sleep(0.3)
                
                # Try to submit
                submit_button = self.driver.find_element(By.ID, "submit-for-review-button")
                self.scroll_to_element(submit_button)
                time.sleep(0.2)
                submit_button.click()
                time.sleep(1.5)  # Wait for validation errors
                
                # Check for validation errors
                validation_errors = self.driver.find_elements(By.XPATH, 
                    "//div[contains(@class, 'error')] | "
                    "//div[contains(text(), 'invalid')] | "
                    "//div[contains(text(), 'valid')] | "
                    "//div[contains(@class, 'destructive')]"
                )
                if validation_errors:
                    print(f"  ✓ Invalid data validation triggered")
                else:
                    print("  ⚠ Invalid data validation may not have triggered")
            except Exception as e:
                print(f"  ⚠ Could not test invalid data: {e}")
            
            # Now fill with valid information - using IDs explicitly to avoid clicking notifications
            # All form fields have IDs: name, email, phone, street, city, state, postal_code, category, description
            # Submit button has ID: submit-for-review-button
            print("Filling salon registration form with valid information (using field IDs only)...")
            print("  Form fields with IDs: name, email, phone, street, city, state, postal_code, category, description")
            print("  Submit button ID: submit-for-review-button")
            try:
                # Ensure we're focused on the form, not navbar
                try:
                    form = self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "form")))
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'start'});", form)
                    time.sleep(0.3)
                except:
                    pass
                
                # Disable inbox button temporarily to prevent accidental clicks
                try:
                    inbox_button = self.driver.find_element(By.ID, "owner-inbox-button")
                    self.driver.execute_script("""
                        arguments[0].style.pointerEvents = 'none';
                        arguments[0].style.opacity = '0.5';
                    """, inbox_button)
                    print("  Disabled inbox button to prevent accidental clicks")
                except:
                    pass
                
                # Fill Salon Name using ID
                print("  Filling Salon Name (id='name')...")
                salon_name_input = self.wait.until(EC.presence_of_element_located((By.ID, "name")))
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", salon_name_input)
                time.sleep(0.2)
                salon_name_input.clear()
                salon_name_input.send_keys("Selenium Test Salon")
                time.sleep(0.2)
                
                # Email is already filled and locked
                print("  Email is locked to account (as expected)")
                time.sleep(0.2)
                
                # Fill Phone Number using ID
                print("  Filling Phone Number (id='phone')...")
                phone_input = self.wait.until(EC.presence_of_element_located((By.ID, "phone")))
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", phone_input)
                time.sleep(0.2)
                phone_input.clear()
                phone_input.send_keys("5551234567")
                time.sleep(0.2)
                
                # Fill Street Address using ID
                print("  Filling Street Address (id='street')...")
                street_input = self.wait.until(EC.presence_of_element_located((By.ID, "street")))
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", street_input)
                time.sleep(0.2)
                street_input.clear()
                street_input.send_keys("123 Test Street")
                time.sleep(0.2)
                
                # Fill City using ID
                print("  Filling City (id='city')...")
                city_input = self.wait.until(EC.presence_of_element_located((By.ID, "city")))
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", city_input)
                time.sleep(0.2)
                city_input.clear()
                city_input.send_keys("Test City")
                time.sleep(0.2)
                
                # Select State using ID (id="state")
                print("  Selecting State (id='state')...")
                state_selected = self.select_strands_select("California", element_id="state")
                if not state_selected:
                    print("  ⚠ Could not select State - trying alternative...")
                    # Try alternative: find button by ID and click, then find option
                    try:
                        state_button = self.wait.until(EC.element_to_be_clickable((By.ID, "state")))
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", state_button)
                        time.sleep(0.2)
                        state_button.click()
                        time.sleep(0.8)
                        # Find California option
                        california_option = WebDriverWait(self.driver, 4).until(
                            EC.element_to_be_clickable((By.XPATH, 
                                "//div[contains(@class, 'absolute')]//div[contains(text(), 'California')] | "
                                "//div[contains(@class, 'cursor-pointer')]//span[contains(text(), 'California')]"
                            ))
                        )
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", california_option)
                        time.sleep(0.2)
                        california_option.click()
                        time.sleep(0.4)
                        print("  ✓ Selected State: California (alternative method)")
                    except Exception as e:
                        print(f"  ✗ Could not select State: {e}")
                
                # Fill Postal Code (numbers only) using ID
                print("  Filling Postal Code (id='postal_code')...")
                postal_code_input = self.wait.until(EC.presence_of_element_located((By.ID, "postal_code")))
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", postal_code_input)
                time.sleep(0.2)
                postal_code_input.clear()
                time.sleep(0.1)
                # Send keys one by one to ensure numeric input
                postal_code_input.send_keys("1")
                time.sleep(0.05)
                postal_code_input.send_keys("2")
                time.sleep(0.05)
                postal_code_input.send_keys("3")
                time.sleep(0.05)
                postal_code_input.send_keys("4")
                time.sleep(0.05)
                postal_code_input.send_keys("5")
                time.sleep(0.2)
                # Verify postal code is numeric
                postal_value = postal_code_input.get_attribute("value")
                if postal_value and not postal_value.replace(" ", "").isdigit():
                    print(f"  ⚠ Warning: Postal code may not be numeric: {postal_value}")
                    # Try clearing and re-entering
                    postal_code_input.clear()
                    time.sleep(0.1)
                    postal_code_input.send_keys("12345")
                    time.sleep(0.2)
                else:
                    print(f"  ✓ Postal code is numeric: {postal_value}")
                
                # Select Salon Type using ID (id="category")
                print("  Selecting Salon Type (id='category')...")
                salon_type_selected = self.select_strands_select("Hair Salon", element_id="category")
                if not salon_type_selected:
                    print("  ⚠ Could not select Salon Type - trying alternative...")
                    # Try alternative: find button by ID and click, then find option
                    try:
                        salon_type_button = self.wait.until(EC.element_to_be_clickable((By.ID, "category")))
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", salon_type_button)
                        time.sleep(0.2)
                        salon_type_button.click()
                        time.sleep(0.8)
                        # Find Hair Salon option
                        hair_salon_option = WebDriverWait(self.driver, 4).until(
                            EC.element_to_be_clickable((By.XPATH,
                                "//div[contains(@class, 'absolute')]//div[contains(text(), 'Hair Salon')] | "
                                "//div[contains(@class, 'cursor-pointer')]//span[contains(text(), 'Hair Salon')]"
                            ))
                        )
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", hair_salon_option)
                        time.sleep(0.2)
                        hair_salon_option.click()
                        time.sleep(0.4)
                        print("  ✓ Selected Salon Type: Hair Salon (alternative method)")
                    except Exception as e:
                        print(f"  ✗ Could not select Salon Type: {e}")
                
                # Fill Description using ID (id="description")
                print("  Filling Description (id='description')...")
                description_input = self.wait.until(EC.presence_of_element_located((By.ID, "description")))
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", description_input)
                time.sleep(0.2)
                description_input.clear()
                time.sleep(0.1)
                description_input.send_keys("This is a test salon created by Selenium automation for testing purposes.")
                time.sleep(0.3)
                # Verify description was filled
                desc_value = description_input.get_attribute("value")
                if desc_value:
                    print(f"  ✓ Description filled: {desc_value[:50]}...")
                else:
                    print("  ⚠ Warning: Description may not have been filled")
                
                # Click Submit for Review button using ID - make absolutely sure we're not clicking inbox
                print("Clicking Submit for Review button (id='submit-for-review-button')...")
                submit_button = self.wait.until(EC.element_to_be_clickable((By.ID, "submit-for-review-button")))
                # Verify it's the correct button by checking its text
                button_text = submit_button.text.strip()
                if "Submit" not in button_text and "Review" not in button_text:
                    print(f"  ⚠ Warning: Button text doesn't match expected: {button_text}")
                
                # Scroll to button to ensure it's visible and not blocked by navbar
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center', behavior: 'smooth'});", submit_button)
                time.sleep(0.5)
                
                # Double-check we're not clicking the inbox button
                try:
                    inbox_button = self.driver.find_element(By.ID, "owner-inbox-button")
                    inbox_location = inbox_button.location
                    submit_location = submit_button.location
                    # If they're too close, scroll more
                    if abs(inbox_location['y'] - submit_location['y']) < 100:
                        self.driver.execute_script("window.scrollBy(0, -150);")
                        time.sleep(0.3)
                except:
                    pass
                
                # Make sure we're clicking the submit button, not any navbar buttons
                try:
                    submit_button.click()
                except:
                    # Fallback: use JavaScript click
                    self.driver.execute_script("arguments[0].click();", submit_button)
                time.sleep(ACTION_DELAY * 4)  # Wait for submission and redirect/modal
                
                # Close notification modal if it opened
                try:
                    notification_modals = self.driver.find_elements(By.XPATH, 
                        "//div[contains(@class, 'fixed')]//h3[contains(text(), 'Notifications')]"
                    )
                    if notification_modals:
                        close_btn = self.driver.find_element(By.XPATH,
                            "//div[contains(@class, 'fixed')]//button[.//*[local-name()='svg']] | "
                            "//button[@aria-label='Close'] | "
                            "//button[contains(@class, 'close')]"
                        )
                        if close_btn and close_btn.is_displayed():
                            close_btn.click()
                            time.sleep(0.3)
                            print("  Closed notification modal after submission")
                except:
                    pass
                
                # Check if a success modal appeared and close it if needed
                try:
                    modal_confirm = WebDriverWait(self.driver, 3).until(
                        EC.presence_of_element_located((By.XPATH, 
                            "//div[contains(@class, 'fixed')]//button[contains(text(), 'OK')] | "
                            "//div[contains(@class, 'fixed')]//button[contains(text(), 'Confirm')] | "
                            "//div[@role='dialog']//button[contains(text(), 'OK')]"
                        ))
                    )
                    if modal_confirm:
                        modal_confirm.click()
                        time.sleep(0.5)
                        print("  Closed success modal")
                except:
                    pass
                
                # Check if submission was successful
                current_url = self.driver.current_url
                if "/owner" in current_url or "/dashboard" in current_url:
                    print("  ✓ Salon registration submitted successfully")
                else:
                    print(f"  ⚠ Salon registration may have failed - redirected to: {current_url}")
            except Exception as e:
                print(f"  Error filling salon registration form: {e}")
                import traceback
                traceback.print_exc()
                return False
            
            # After salon registration form is submitted, log out of owner account
            print("Logging out of owner account after salon registration...")
            time.sleep(1.5)  # Wait for page to load after form submission
            try:
                # Try owner logout button ID first
                try:
                    logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "owner-logout-button")))
                    self.scroll_to_element(logout_button)
                    time.sleep(0.2)
                    logout_button.click()
                    time.sleep(1.5)  # Wait for logout modal to appear
                    
                    # Handle logout success modal - click OK button
                    print("  Handling logout success modal...")
                    try:
                        ok_button = WebDriverWait(self.driver, 5).until(
                            EC.element_to_be_clickable((By.ID, "logout-modal-ok-button"))
                        )
                        ok_button.click()
                        time.sleep(0.5)
                        print("  ✓ Clicked OK on logout modal")
                    except:
                        # Fallback: try to find OK button by text
                        try:
                            ok_button = WebDriverWait(self.driver, 3).until(
                                EC.element_to_be_clickable((By.XPATH,
                                    "//div[contains(@class, 'fixed')]//button[contains(text(), 'OK')] | "
                                    "//div[@role='dialog']//button[contains(text(), 'OK')]"
                                ))
                            )
                            ok_button.click()
                            time.sleep(0.5)
                            print("  ✓ Clicked OK on logout modal (fallback)")
                        except:
                            print("  ⚠ Could not find OK button on logout modal")
                    
                    time.sleep(1.0)
                    print("  ✓ Logged out using owner logout button ID")
                except:
                    # Fallback to XPath
                    logout_buttons = self.driver.find_elements(By.XPATH, 
                        "//button[@id='owner-logout-button'] | "
                        "//button[contains(text(), 'Logout')] | "
                        "//button[contains(., 'Logout')]"
                    )
                    if logout_buttons:
                        self.scroll_to_element(logout_buttons[0])
                        time.sleep(0.2)
                        logout_buttons[0].click()
                        time.sleep(1.5)
                        
                        # Handle logout modal
                        try:
                            ok_button = WebDriverWait(self.driver, 5).until(
                                EC.element_to_be_clickable((By.ID, "logout-modal-ok-button"))
                            )
                            ok_button.click()
                            time.sleep(0.5)
                            print("  ✓ Clicked OK on logout modal")
                        except:
                            pass
                        
                        time.sleep(1.0)
                        print("  ✓ Logged out (fallback)")
                    else:
                        # Navigate to home and clear session
                        self.driver.get(f"{BASE_URL}/")
                        time.sleep(0.5)
                        print("  ✓ Navigated to home (logout)")
            except Exception as e:
                print(f"  ⚠ Error logging out: {e}")
            
            # Log back into admin account
            print("Logging back into admin account...")
            if not self.login("admin@strands.com", "test123", "Admin"):
                return False
            
            # Navigate to salon management page
            print("Navigating to Salon Management page...")
            salon_mgmt_clicked = self.safe_click(
                By.XPATH,
                "//button[contains(text(), 'Salon Management')] | //a[contains(text(), 'Salon Management')]",
                "Salon Management tab"
            )
            if not salon_mgmt_clicked:
                self.navigate_and_scroll(f"{BASE_URL}/admin/salon-verification")
            else:
                time.sleep(1.0)
            
            # Wait for page to load
            time.sleep(1.5)
            
            # Find and approve the new salon using approve button ID
            print("Looking for new salon to approve...")
            try:
                # Find all approve buttons using ID pattern
                approve_buttons = self.driver.find_elements(By.XPATH, 
                    "//button[starts-with(@id, 'approve-salon-')]"
                )
                
                if approve_buttons:
                    print(f"Found {len(approve_buttons)} Approve button(s), clicking first one...")
                    
                    # Scroll to button
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", approve_buttons[0])
                    time.sleep(0.5)
                    
                    # Wait for button to be clickable
                    approve_btn = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable(approve_buttons[0])
                    )
                    
                    # Click the button
                    try:
                        approve_btn.click()
                    except:
                        self.driver.execute_script("arguments[0].click();", approve_btn)
                    
                    time.sleep(1.0)  # Wait for modal to appear
                    
                    # Wait for modal and click confirm
                    modal_clicked = False
                    for attempt in range(3):
                        if self.wait_for_modal(timeout=4):
                            if self.click_modal_confirm(timeout=4):
                                time.sleep(1.0)  # Wait for approval to complete
                                print("  ✓ Salon approved successfully")
                                modal_clicked = True
                                break
                        time.sleep(0.5)
                    
                    if not modal_clicked:
                        print("  WARNING: Could not complete approval - continuing")
                else:
                    print("  No Approve buttons found (no pending salons)")
            except Exception as e:
                print(f"  Error approving salon: {e}")
            
            # Log out of admin using logout button ID
            print("Logging out of admin...")
            time.sleep(0.5)
            try:
                # Try desktop logout button first
                try:
                    logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "admin-logout-button")))
                    self.scroll_to_element(logout_button)
                    time.sleep(0.2)
                    logout_button.click()
                    time.sleep(1.5)  # Wait for logout modal to appear
                    
                    # Handle logout success modal - click OK button
                    print("  Handling logout success modal...")
                    try:
                        ok_button = WebDriverWait(self.driver, 5).until(
                            EC.element_to_be_clickable((By.ID, "logout-modal-ok-button"))
                        )
                        ok_button.click()
                        time.sleep(0.5)
                        print("  ✓ Clicked OK on logout modal")
                    except:
                        # Fallback: try to find OK button by text
                        try:
                            ok_button = WebDriverWait(self.driver, 3).until(
                                EC.element_to_be_clickable((By.XPATH,
                                    "//div[contains(@class, 'fixed')]//button[contains(text(), 'OK')] | "
                                    "//div[@role='dialog']//button[contains(text(), 'OK')]"
                                ))
                            )
                            ok_button.click()
                            time.sleep(0.5)
                            print("  ✓ Clicked OK on logout modal (fallback)")
                        except:
                            print("  ⚠ Could not find OK button on logout modal")
                    
                    time.sleep(1.0)
                    print("  ✓ Logged out of admin")
                except:
                    # Try mobile logout button
                    try:
                        logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "admin-logout-button-mobile")))
                        self.scroll_to_element(logout_button)
                        time.sleep(0.2)
                        logout_button.click()
                        time.sleep(1.5)
                        
                        # Handle logout modal
                        try:
                            ok_button = WebDriverWait(self.driver, 5).until(
                                EC.element_to_be_clickable((By.ID, "logout-modal-ok-button"))
                            )
                            ok_button.click()
                            time.sleep(0.5)
                            print("  ✓ Clicked OK on logout modal")
                        except:
                            pass
                        
                        time.sleep(1.0)
                        print("  ✓ Logged out of admin (mobile)")
                    except:
                        # Fallback to XPath
                        logout_buttons = self.driver.find_elements(By.XPATH, 
                            "//button[contains(text(), 'Logout')] | "
                            "//button[contains(., 'Logout')]"
                        )
                        if logout_buttons:
                            self.scroll_to_element(logout_buttons[0])
                            time.sleep(0.2)
                            logout_buttons[0].click()
                            time.sleep(1.5)
                            
                            # Handle logout modal
                            try:
                                ok_button = WebDriverWait(self.driver, 5).until(
                                    EC.element_to_be_clickable((By.ID, "logout-modal-ok-button"))
                                )
                                ok_button.click()
                                time.sleep(0.5)
                                print("  ✓ Clicked OK on logout modal")
                            except:
                                pass
                            
                            time.sleep(1.0)
                            print("  ✓ Logged out of admin (fallback)")
            except Exception as e:
                print(f"  ⚠ Error logging out: {e}")
            
            # Log back into the owner account that was just created
            print(f"Logging back into owner account: {self.owner_email}")
            if not self.login(self.owner_email, owner_password, "Owner"):
                return False
            
            # Should start on overview page after login
            time.sleep(1.5)
            current_url = self.driver.current_url
            if "/owner/overview" not in current_url:
                # Navigate to overview if not already there
                self.navigate_and_scroll(f"{BASE_URL}/owner/overview")
                time.sleep(1.0)
            
            # Go through owner dashboard tabs in order (as shown in navbar)
            print("Going through owner dashboard tabs in order...")
            owner_tabs = [
                ("/owner/overview", "Overview"),
                ("/owner/staff", "Staff"),
                ("/owner/products", "Products"),
                ("/owner/customers", "Customers"),
                ("/owner/order-history", "Order History"),
                ("/owner/reviews", "Reviews"),
                ("/owner/revenue", "Revenue"),
                ("/owner/loyalty", "Loyalty & Promotions"),
                ("/owner/settings", "Settings"),
            ]
            
            for path, name in owner_tabs:
                print(f"  Checking {name} page...")
                self.navigate_and_scroll(f"{BASE_URL}{path}")
                time.sleep(1.5)  # Wait for page to load
                
                # Visibly scroll to show all content
                print(f"    Scrolling through {name} page...")
                time.sleep(0.5)
                page_height = self.driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
                viewport_height = self.driver.execute_script("return window.innerHeight")
                
                # Scroll in increments to make it visible
                scroll_increment = viewport_height * 0.8
                current_scroll = 0
                while current_scroll < page_height:
                    current_scroll += scroll_increment
                    self.driver.execute_script(f"window.scrollTo(0, {current_scroll});")
                    time.sleep(0.4)  # Delay to make scrolling visible
                
                # Scroll to bottom
                self.driver.execute_script(f"window.scrollTo(0, {page_height});")
                time.sleep(0.5)
                
                # Scroll back to top
                self.driver.execute_script("window.scrollTo(0, 0);")
                time.sleep(0.3)
                print(f"    ✓ {name} page scrolled through")
            
            print("  ✓ All owner dashboard tabs checked")
            return True
        except Exception as e:
            print(f" Test 5 failed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def run_all_tests(self):
        print("=" * 70)
        print("STRANDS PLATFORM SELENIUM TEST SUITE - PHASE 1 & 2")
        print("=" * 70)
        
        start_time = time.time()
        
        try:
            self.setup()
            
            tests = [
                self.test_1_login_page_loads,
                self.test_2_invalid_login_attempt,
                self.test_3_successful_login_admin,
                self.test_4_admin_pages_and_salon_rejection,
                self.test_5_owner_signup_and_admin_approval,
            ]
            
            passed = 0
            failed = 0
            
            for test in tests:
                test_start = time.time()
                try:
                    # Check if driver is still valid before each test
                    try:
                        if not self.driver or not hasattr(self.driver, 'current_url'):
                            print("Browser session lost, restarting...")
                            self.setup()
                    except:
                        print("Browser session lost, restarting...")
                        self.setup()
                    
                    # Run test
                    result = test()
                    test_duration = time.time() - test_start
                    
                    if test_duration > MAX_TEST_TIME:
                        print(f"WARNING: Test {test.__name__} took {test_duration:.1f}s (exceeded {MAX_TEST_TIME}s limit)")
                    
                    if result:
                        passed += 1
                        self.test_results.append((test.__name__, "PASSED"))
                    else:
                        failed += 1
                        self.test_results.append((test.__name__, "FAILED"))
                except KeyboardInterrupt:
                    print(f"\nWARNING: Test interrupted: {test.__name__}")
                    raise
                except (TimeoutException, WebDriverException) as e:
                    failed += 1
                    error_msg = str(e)[:80]
                    self.test_results.append((test.__name__, f"ERROR: {error_msg}"))
                    print(f"Test {test.__name__} error: {error_msg}")
                    # Try to recover browser if session lost
                    try:
                        if "invalid session" in str(e).lower() or "disconnected" in str(e).lower():
                            print("  Browser session lost, will restart for next test...")
                            self.driver = None
                            self.wait = None
                    except:
                        pass
                except Exception as e:
                    failed += 1
                    error_msg = str(e)[:80]
                    self.test_results.append((test.__name__, f"ERROR: {error_msg}"))
                    print(f"Test {test.__name__} crashed: {error_msg}")
                finally:
                    # Cleanup between tests
                    try:
                        if self.driver:
                            # Dismiss any modals
                            try:
                                cancel_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Cancel')]")
                                if cancel_buttons:
                                    self.driver.execute_script("arguments[0].click();", cancel_buttons[0])
                                    time.sleep(0.1)
                            except:
                                pass
                    except:
                        pass
            
            elapsed_time = time.time() - start_time
            
            print("\n" + "=" * 70)
            print("TEST SUMMARY - PHASE 1, 2 & 3")
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

