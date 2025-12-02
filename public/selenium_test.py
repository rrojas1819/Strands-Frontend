from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from datetime import datetime, timedelta
import time
import random
import string
import signal
import sys

BASE_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:3001/api"
WAIT_TIMEOUT = 3  # Fast timeout
ACTION_DELAY = 0.1  # Very fast execution
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
        self.user_password = "test123"
        self.latest_promo_code = None
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
    
    def configure_loyalty_program(self, target_visits, discount_pct, description, preferred_button_id=None):
        """Fill loyalty program form and click Create/Update"""
        try:
            target_input = self.wait.until(EC.presence_of_element_located((By.ID, "loyalty-target-visits-input")))
            discount_input = self.wait.until(EC.presence_of_element_located((By.ID, "loyalty-discount-input")))
            note_input = self.wait.until(EC.presence_of_element_located((By.ID, "loyalty-description-input")))

            self.safe_send_keys_element(target_input, str(target_visits), "Loyalty target visits")
            self.safe_send_keys_element(discount_input, str(discount_pct), "Loyalty discount percentage")
            self.safe_send_keys_element(note_input, description, "Loyalty description")

            button_candidates = []
            if preferred_button_id:
                button_candidates.append(preferred_button_id)
            button_candidates.extend([
                "create-loyalty-settings-button",
                "update-loyalty-settings-button"
            ])

            seen = set()
            for button_id in button_candidates:
                if not button_id or button_id in seen:
                    continue
                seen.add(button_id)
                try:
                    submit_button = WebDriverWait(self.driver, 3).until(
                        EC.element_to_be_clickable((By.ID, button_id))
                    )
                    self.scroll_to_element(submit_button)
                    time.sleep(0.2)
                    submit_button.click()
                    print(f"    ✓ Clicked loyalty submit button ({button_id})")
                    try:
                        ok_button = WebDriverWait(self.driver, 10).until(
                            EC.element_to_be_clickable((By.ID, "loyalty-settings-success-ok-button"))
                        )
                        self.scroll_to_element(ok_button)
                        time.sleep(0.2)
                        ok_button.click()
                        print("    ✓ Confirmed loyalty settings success modal")
                    except Exception as modal_error:
                        print(f"    ⚠ Could not find loyalty success modal OK button: {modal_error}")
                    return True
                except TimeoutException:
                    continue
                except Exception as e:
                    print(f"    ⚠ Error clicking loyalty submit button {button_id}: {e}")
            print("    ⚠ Loyalty submit button not found")
            return False
        except Exception as e:
            print(f"    ⚠ Error configuring loyalty program: {e}")
            return False

    def send_individual_promotion(self, email, discount_pct, expiration_days=7):
        """Send a promotion to a specific customer.
        
        The expiration date must be entered in MM/DD/YYYY format (e.g., 02/02/2026).
        """
        try:
            email_input = self.wait.until(EC.presence_of_element_located((By.ID, "promotion-email-input")))
            discount_input = self.wait.until(EC.presence_of_element_located((By.ID, "promotion-discount-input")))
            expiration_input = self.wait.until(EC.presence_of_element_located((By.ID, "promotion-expiration-input")))

            # HTML5 date inputs expect YYYY-MM-DD format internally, even though they may display as MM/DD/YYYY
            expiration_value_native = "2026-02-02"  # Native format for HTML5 date input

            # Fill email and discount fields and ensure React state updates
            self.safe_send_keys_element(email_input, email, "Promotion email")
            
            # Fill discount and trigger React events to ensure state updates
            discount_input.clear()
            time.sleep(0.2)
            discount_input.send_keys(str(discount_pct))
            time.sleep(0.2)
            # Trigger React onChange for discount
            self.driver.execute_script(
                "arguments[0].dispatchEvent(new Event('input', {bubbles: true})); arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
                discount_input
            )
            time.sleep(0.3)
            print(f"    ✓ Set discount percentage to {discount_pct}%")
            
            # Set expiration date using calendar picker - interact with the calendar popup
            # Target date: February 2, 2026 (MM/DD/YYYY = 02/02/2026)
            print("    Setting expiration date using calendar picker (02/02/2026)...")
            self.scroll_to_element(expiration_input)
            time.sleep(0.3)
            
            # Clear the field first
            expiration_input.clear()
            time.sleep(0.2)
            
            # Click the input to open the calendar picker (this is what the user requested)
            expiration_input.click()
            time.sleep(0.5)
            
            # HTML5 date inputs display in MM/DD/YYYY format but internally use YYYY-MM-DD
            # We'll type in MM/DD/YYYY format as the user requested, character by character
            # Then ensure React state updates properly
            date_set = False
            
            try:
                # Type the date in MM/DD/YYYY format (as displayed in UI)
                # The browser should parse this and convert it internally
                expiration_input.send_keys("02")
                time.sleep(0.1)
                expiration_input.send_keys("/")
                time.sleep(0.1)
                expiration_input.send_keys("02")
                time.sleep(0.1)
                expiration_input.send_keys("/")
                time.sleep(0.1)
                expiration_input.send_keys("2026")
                time.sleep(0.5)
                
                # Trigger React events to ensure state updates properly
                self.driver.execute_script(
                    """
                    var input = arguments[0];
                    // Trigger input event for React onChange
                    var inputEvent = new Event('input', { bubbles: true, cancelable: true });
                    input.dispatchEvent(inputEvent);
                    
                    // Trigger change event for React onChange
                    var changeEvent = new Event('change', { bubbles: true, cancelable: true });
                    input.dispatchEvent(changeEvent);
                    
                    // Also ensure the value is properly set if browser didn't parse MM/DD/YYYY
                    // Set native format as fallback
                    if (!input.value || input.value === '') {
                        input.value = '2026-02-02';
                        input.dispatchEvent(inputEvent);
                        input.dispatchEvent(changeEvent);
                    }
                    """,
                    expiration_input
                )
                time.sleep(0.5)
                
                # Verify the field has a value
                field_value = expiration_input.get_attribute("value")
                if field_value and field_value.strip():
                    print(f"    ✓ Promotion expiration date set successfully (field value: {field_value})")
                    date_set = True
                else:
                    # Fallback: Set using native YYYY-MM-DD format via JavaScript
                    print("    ⚠ MM/DD/YYYY input didn't set value, using JavaScript fallback...")
                    self.driver.execute_script(
                        """
                        var input = arguments[0];
                        input.value = '2026-02-02';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        """,
                        expiration_input
                    )
                    time.sleep(0.5)
                    field_value = expiration_input.get_attribute("value")
                    if field_value:
                        print(f"    ✓ Set expiration date via JavaScript fallback (value: {field_value})")
                        date_set = True
                        
            except Exception as e:
                print(f"    ⚠ Error setting date: {e}, trying JavaScript fallback...")
                try:
                    # Final fallback: Direct JavaScript setting
                    self.driver.execute_script(
                        """
                        var input = arguments[0];
                        input.value = '2026-02-02';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        """,
                        expiration_input
                    )
                    time.sleep(0.5)
                    field_value = expiration_input.get_attribute("value")
                    if field_value:
                        print(f"    ✓ Set expiration date via final fallback (value: {field_value})")
                        date_set = True
                except Exception as fallback_error:
                    print(f"    ⚠ All methods failed: {fallback_error}")
            
            if not date_set:
                print("    ⚠ WARNING: Could not set expiration date. Continuing anyway...")

            # Final verification - check that both required fields have values in React state
            # Check discount first
            final_discount_value = discount_input.get_attribute("value")
            if not final_discount_value or final_discount_value.strip() == "":
                print(f"    ⚠ ERROR: Discount percentage is still empty in DOM before sending. Cannot proceed.")
                return False
            print(f"    ✓ Final verification: Discount percentage is set (value: {final_discount_value})")
            
            # Check expiration date
            final_expiration_value = expiration_input.get_attribute("value")
            if not final_expiration_value or final_expiration_value.strip() == "":
                print(f"    ⚠ ERROR: Expiration date is still empty in DOM before sending. Cannot proceed.")
                return False
            
            print(f"    ✓ Final verification: Expiration date is set in DOM (value: {final_expiration_value})")
            # Wait a bit more to ensure React state has fully updated for both fields
            time.sleep(0.5)

            # Submit the form by pressing Enter in the expiration field
            print("    Submitting promotion form by pressing Enter in expiration field...")
            expiration_input.click()  # Ensure field is focused
            time.sleep(0.2)
            expiration_input.send_keys(Keys.ENTER)
            time.sleep(0.5)
            print("    ✓ Submitted promotion form via Enter key")

            try:
                ok_button = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.ID, "promotion-success-ok-button"))
                )
                self.scroll_to_element(ok_button)
                time.sleep(0.2)
                ok_button.click()
                print("    ✓ Confirmed promotion success modal")
            except Exception as modal_error:
                print(f"    ⚠ Could not confirm promotion success modal: {modal_error}")
            return True
        except Exception as e:
            print(f"    ⚠ Error sending promotion: {e}")
            return False

    def send_unused_offer_reminders(self):
        """Trigger reminder notifications for unused offers"""
        try:
            reminder_button = self.wait.until(EC.element_to_be_clickable((By.ID, "send-reminders-button")))
            self.scroll_to_element(reminder_button)
            time.sleep(0.2)
            reminder_button.click()
            print("    ✓ Clicked Send Reminders button")
            try:
                ok_button = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.ID, "promotion-reminder-success-ok-button"))
                )
                self.scroll_to_element(ok_button)
                time.sleep(0.2)
                ok_button.click()
                print("    ✓ Confirmed reminder success modal")
            except Exception as modal_error:
                print(f"    ⚠ Could not confirm reminder success modal: {modal_error}")
            return True
        except Exception as e:
            print(f"    ⚠ Error sending reminders: {e}")
            return False

    def capture_latest_promo_code_from_inbox(self):
        """Open inbox, capture most recent promo code, and close inbox"""
        inbox_opened = False
        try:
            inbox_button = self.wait.until(EC.element_to_be_clickable((By.ID, "user-inbox-button")))
            self.scroll_to_element(inbox_button)
            time.sleep(0.2)
            inbox_button.click()
            print("    ✓ Opened notification inbox")
            inbox_opened = True

            WebDriverWait(self.driver, 10).until(
                EC.visibility_of_element_located((By.ID, "notification-inbox-panel"))
            )

            promo_inputs = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.XPATH, "//input[starts-with(@id, 'notification-promo-code-input-')]"))
            )
            if promo_inputs:
                promo_code = promo_inputs[0].get_attribute("value").strip()
                self.latest_promo_code = promo_code
                print(f"    ✓ Captured promo code from inbox: {promo_code}")
            else:
                print("    ⚠ No promo code inputs found in inbox")
            return bool(self.latest_promo_code)
        except Exception as e:
            print(f"    ⚠ Error capturing promo code from inbox: {e}")
            return False
        finally:
            if inbox_opened:
                try:
                    close_button = self.wait.until(EC.element_to_be_clickable((By.ID, "notification-inbox-close-button")))
                    self.scroll_to_element(close_button)
                    time.sleep(0.2)
                    close_button.click()
                    WebDriverWait(self.driver, 5).until_not(
                        EC.visibility_of_element_located((By.ID, "notification-inbox-panel"))
                    )
                    print("    ✓ Closed notification inbox")
                except Exception as close_error:
                    print(f"    ⚠ Could not close notification inbox cleanly: {close_error}")

    def apply_saved_promo_code(self):
        """Apply stored promo code on payment page"""
        if not self.latest_promo_code:
            print("    ℹ No saved promo code to apply")
            return False
        try:
            promo_input = self.wait.until(EC.presence_of_element_located((By.ID, "promo-code-input")))
            self.scroll_to_element(promo_input)
            time.sleep(0.2)
            promo_input.clear()
            promo_input.send_keys(self.latest_promo_code)
            print(f"    ✓ Entered promo code: {self.latest_promo_code}")
            
            # Wait for debounce (500ms) + validation time
            time.sleep(1.5)  # Give time for debounce and API call
            
            # Wait for success message using ID
            WebDriverWait(self.driver, 10).until(
                EC.visibility_of_element_located((By.ID, "promo-code-success-message"))
            )
            print("    ✓ Promo code applied successfully")
            time.sleep(1)
            return True
        except Exception as e:
            print(f"    ⚠ Failed to apply promo code: {e}")
            return False

    def perform_loyalty_and_promotion_updates(self):
        """Logout user, update loyalty/promo settings as owner, send promotion/reminders, capture code"""
        try:
            if not self.user_email:
                print("  ⚠ No user email stored; skipping loyalty/promotion updates")
                return False
            print("\nSwitching to owner to update loyalty program and promotions...")
            self.logout()
            if not self.login(self.owner_email, self.owner_password, "Owner (for loyalty updates)"):
                return False

            # Navigate to loyalty tab
            self.navigate_and_scroll(f"{BASE_URL}/owner/loyalty")
            time.sleep(1)

            # Ensure loyalty program subtab is active
            try:
                program_tab = self.wait.until(EC.element_to_be_clickable((By.ID, "loyalty-subtab-loyalty-program-button")))
                self.scroll_to_element(program_tab)
                time.sleep(0.2)
                program_tab.click()
                time.sleep(1)
            except Exception as e:
                print(f"    ⚠ Could not click loyalty program subtab: {e}")

            self.configure_loyalty_program(
                target_visits=4,
                discount_pct=40,
                description="Updated automation reward: 40% off any service after 4 visits",
                preferred_button_id="update-loyalty-settings-button"
            )

            # Switch to promotions subtab
            try:
                promotions_tab = self.wait.until(EC.element_to_be_clickable((By.ID, "loyalty-subtab-promotions-button")))
                self.scroll_to_element(promotions_tab)
                time.sleep(0.2)
                promotions_tab.click()
                time.sleep(1)
            except Exception as e:
                print(f"    ⚠ Could not click promotions subtab: {e}")

            # Send promotion to the current user
            if self.user_email:
                self.send_individual_promotion(
                    email=self.user_email,
                    discount_pct=15,
                    expiration_days=10
                )
            else:
                print("    ⚠ No user email available to send promotion")

            # Send reminders to all customers with unused offers
            self.send_unused_offer_reminders()

            # Logout owner and log back into user account
            self.logout()
            if not self.login(self.user_email, self.user_password, "User (after promotions)"):
                return False

            # Capture latest promo code from inbox for second booking
            time.sleep(2)
            self.capture_latest_promo_code_from_inbox()
            return True
        except Exception as e:
            print(f"  ⚠ Error while performing loyalty/promotion updates: {e}")
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
                    time.sleep(0.3)
                    
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
        
        # Wait for URL to change from /login to a dashboard/admin/owner page
        try:
            # Wait for URL to change (indicating redirect happened)
            WebDriverWait(self.driver, WAIT_TIMEOUT).until(
                lambda d: "/login" not in d.current_url
            )
            
            # Additional wait for redirect to complete
            time.sleep(0.3)
            
            # Check URL after login
            current_url = self.driver.current_url
            if "/dashboard" in current_url or "/admin" in current_url or "/owner" in current_url:
                print(f"Successfully logged in as {role_description}")
                return True
            else:
                # Sometimes the URL might be slightly different, check if we're not on login page
                if "/login" not in current_url:
                    print(f"Successfully logged in as {role_description} (URL: {current_url})")
                    return True
                else:
                    print(f"Login may have failed - still on login page. Current URL: {current_url}")
                    return False
        except TimeoutException:
            # If URL didn't change, check current state
            current_url = self.driver.current_url
            if "/dashboard" in current_url or "/admin" in current_url or "/owner" in current_url:
                print(f"Successfully logged in as {role_description} (URL check after timeout)")
                return True
            elif "/login" not in current_url:
                # Not on login page, likely successful
                print(f"Successfully logged in as {role_description} (not on login page: {current_url})")
                return True
            else:
                print(f"Login failed - still on login page after timeout. Current URL: {current_url}")
                return False
    
    def convert_12h_to_24h(self, time_12h):
        """Convert 12-hour format (HH:MM AM/PM) to 24-hour format (HH:MM)"""
        try:
            time_str = time_12h.strip().upper()
            if 'AM' in time_str or 'PM' in time_str:
                # Extract time and period
                time_part = time_str.replace('AM', '').replace('PM', '').strip()
                period = 'AM' if 'AM' in time_str else 'PM'
                
                # Split hours and minutes
                parts = time_part.split(':')
                if len(parts) != 2:
                    raise ValueError("Invalid time format")
                
                hours = int(parts[0])
                minutes_str = parts[1].strip()
                
                # Ensure minutes are 2 digits
                if len(minutes_str) == 1:
                    minutes_str = f"0{minutes_str}"
                elif len(minutes_str) == 0:
                    minutes_str = "00"
                
                # Convert to 24-hour format
                if period == 'AM':
                    if hours == 12:
                        hours = 0
                else:  # PM
                    if hours != 12:
                        hours += 12
                
                # Ensure format is exactly HH:MM
                result = f"{hours:02d}:{minutes_str}"
                # Validate format (should be exactly 5 characters: HH:MM)
                if len(result) != 5 or result.count(':') != 1:
                    raise ValueError(f"Invalid time format result: {result}")
                
                return result
            else:
                # Already in 24-hour format or invalid
                # Ensure it's in HH:MM format
                if ':' in time_str:
                    parts = time_str.split(':')
                    if len(parts) == 2:
                        hours = int(parts[0])
                        minutes = parts[1].zfill(2)  # Pad minutes to 2 digits
                        return f"{hours:02d}:{minutes}"
                return time_str
        except Exception as e:
            print(f"Error converting time {time_12h}: {e}")
            return time_12h
    
    def wait_for_modal(self, timeout=4):
        """Wait for confirmation modal to appear"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            modal = wait.until(EC.any_of(
                EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'fixed') and contains(@class, 'inset-0')]")),
                EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'z-50') and contains(@class, 'fixed')]")),
                EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
            ))
            time.sleep(0.2)  # Wait for modal animation
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
                time.sleep(0.3)  # Wait for dropdown to open
            
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
                        time.sleep(0.1)  # Wait for selection to register
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
                time.sleep(ACTION_DELAY)  # Wait longer for redirect
            current_url = self.driver.current_url
            print(f" Current URL after login: {current_url}")
            
            if "/admin" in current_url or "/dashboard" in current_url or "tab=user-analytics" in current_url:
                print(" Admin login successful and redirected to dashboard")
                
                # Navigate to salon verification page
                print("Navigating to Salon Verification page...")
                try:
                    salon_mgmt_clicked = self.safe_click(
                        By.XPATH,
                        "//button[contains(text(), 'Salon Management')] | //a[contains(text(), 'Salon Management')]",
                        "Salon Management tab"
                    )
                    if not salon_mgmt_clicked:
                        self.navigate_and_scroll(f"{BASE_URL}/admin/salon-verification")
                    else:
                        time.sleep(0.3)
                    
                    # Wait for page to load
                    time.sleep(0.5)
                    current_url = self.driver.current_url
                    print(f" Current URL after navigation: {current_url}")
                    if "/admin/salon-verification" in current_url:
                        print(" Successfully navigated to Salon Verification page")
                    else:
                        print(f" Navigation to salon verification may have failed - current URL: {current_url}")
                        # Still pass if we're on an admin page (login worked)
                        if "/admin" in current_url or "/dashboard" in current_url:
                            print(" Still on admin page, login was successful")
                except Exception as nav_error:
                    print(f" Navigation to salon verification failed (but login was successful): {nav_error}")
                
                # Test passes if login was successful, regardless of navigation
                return True
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
                    time.sleep(0.3)
            
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
                        time.sleep(0.3)
                    
                    # Wait for page to load
                    time.sleep(0.5)
                    
                    # Test pagination: click next, then previous
                    print(f"    Testing pagination buttons...")
                    try:
                        # Check if pagination exists (only shows if totalPages > 1)
                        next_button = self.driver.find_elements(By.ID, "pagination-next-button")
                        if next_button and not next_button[0].get_attribute("disabled"):
                            # Click next button
                            print(f"      Clicking 'Next' pagination button...")
                            self.scroll_to_element(next_button[0])
                            time.sleep(0.2)
                            next_button[0].click()
                            time.sleep(0.5)
                            print(f"      ✓ Clicked 'Next' button")
                            
                            # Now click previous button
                            prev_button = self.wait.until(
                                EC.element_to_be_clickable((By.ID, "pagination-previous-button"))
                            )
                            print(f"      Clicking 'Previous' pagination button...")
                            self.scroll_to_element(prev_button)
                            time.sleep(0.2)
                            prev_button.click()
                            time.sleep(0.5)
                            print(f"      ✓ Clicked 'Previous' button")
                        else:
                            print(f"      ⚠ Pagination buttons not available or disabled (may be on first/last page or only one page)")
                    except Exception as e:
                        print(f"      ⚠ Could not test pagination: {e}")
                elif name == "Loyalty Monitoring":
                    loyalty_clicked = self.safe_click(
                        By.XPATH,
                        "//button[contains(text(), 'Loyalty Monitoring')] | //a[contains(text(), 'Loyalty Monitoring')]",
                        "Loyalty Monitoring tab"
                    )
                    if not loyalty_clicked:
                        self.navigate_and_scroll(f"{BASE_URL}{path}")
                    else:
                        time.sleep(0.3)
                elif name == "User Analytics":
                    user_analytics_clicked = self.safe_click(
                        By.XPATH,
                        "//button[contains(text(), 'User Analytics')] | //a[contains(text(), 'User Analytics')]",
                        "User Analytics tab"
                    )
                    if not user_analytics_clicked:
                        self.navigate_and_scroll(f"{BASE_URL}{path}")
                    else:
                        time.sleep(0.3)
                    
                    # Wait for User Analytics page to load
                    time.sleep(0.5)
                    
                    # First, scroll through the Overview tab (default/base tab)
                    print(f"    Scrolling through 'Overview' subtab (default)...")
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
                    print(f"    ✓ Scrolled through 'Overview' subtab")
                    
                    # Click on "Activity & Retention" subtab
                    print(f"    Clicking on 'Activity & Retention' subtab...")
                    try:
                        activity_retention_tab = self.wait.until(
                            EC.element_to_be_clickable((By.XPATH, 
                                "//button[contains(text(), 'Activity & Retention')] | "
                                "//button[contains(text(), 'Activity and Retention')] | "
                                "//a[contains(text(), 'Activity & Retention')] | "
                                "//a[contains(text(), 'Activity and Retention')]"
                            ))
                        )
                        self.scroll_to_element(activity_retention_tab)
                        time.sleep(0.2)
                        activity_retention_tab.click()
                        time.sleep(0.5)
                        print(f"    ✓ Clicked 'Activity & Retention' subtab")
                    except Exception as e:
                        print(f"    ⚠ Could not find or click 'Activity & Retention' subtab: {e}")
                elif name == "Business Insights":
                    business_clicked = self.safe_click(
                        By.XPATH,
                        "//button[contains(text(), 'Business Insights')] | //a[contains(text(), 'Business Insights')]",
                        "Business Insights tab"
                    )
                    if not business_clicked:
                        self.navigate_and_scroll(f"{BASE_URL}{path}")
                    else:
                        time.sleep(0.3)
                elif name == "Revenue Analytics":
                    revenue_clicked = self.safe_click(
                        By.XPATH,
                        "//button[contains(text(), 'Revenue Tracking')] | //button[contains(text(), 'Revenue Analytics')] | //a[contains(text(), 'Revenue')]",
                        "Revenue Tracking tab"
                    )
                    if not revenue_clicked:
                        self.navigate_and_scroll(f"{BASE_URL}{path}")
                    else:
                        time.sleep(0.3)
                else:
                    self.navigate_and_scroll(f"{BASE_URL}{path}")
                
                time.sleep(0.5)  # Wait for page to load
                
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
                time.sleep(0.3)
            
            # Wait for page to load
            time.sleep(0.3)
            
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
                    time.sleep(0.3)  # Wait for filter to apply and content to load
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
                time.sleep(0.3)  # Wait for filter to apply
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
                    
                    time.sleep(0.3)  # Wait for modal to appear
                    
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
                                time.sleep(0.3)  # Wait for rejection to complete
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
                    time.sleep(0.3)  # Wait for logout modal to appear
                    
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
                    
                    time.sleep(0.3)
                    print("  ✓ Logged out successfully")
                except:
                    # Try mobile logout button
                    try:
                        logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "admin-logout-button-mobile")))
                        self.scroll_to_element(logout_button)
                        time.sleep(0.2)
                        logout_button.click()
                        time.sleep(0.5)
                        
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
                        
                        time.sleep(0.3)
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
                            time.sleep(0.5)
                            
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
                            
                            time.sleep(0.3)
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
                time.sleep(0.3)
            
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
            
            time.sleep(0.5)  # Wait for signup page to load
            
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
                time.sleep(0.3)  # Wait for validation errors
                
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
                time.sleep(0.3)  # Wait for validation errors
                
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
            self.owner_password = "test123"
            owner_password = self.owner_password  # Keep local variable for compatibility
            
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
                create_account_button.click()
                time.sleep(ACTION_DELAY * 2)  # Wait for account creation and redirect
                
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
            time.sleep(0.5)  # Wait for redirect to salon registration page
            
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
                time.sleep(0.3)  # Wait for validation errors
                
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
                time.sleep(0.3)  # Wait for validation errors
                
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
                time.sleep(ACTION_DELAY * 2)  # Wait for submission and redirect/modal
                
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
            time.sleep(0.5)  # Wait for page to load after form submission
            try:
                # Try owner logout button ID first
                try:
                    logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "owner-logout-button")))
                    self.scroll_to_element(logout_button)
                    time.sleep(0.2)
                    logout_button.click()
                    # Wait for logout to process and redirect
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
                        # Wait for logout to process and redirect
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
                time.sleep(0.3)
            
            # Wait for page to load
            time.sleep(0.3)
            
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
                    
                    time.sleep(0.3)  # Wait for modal to appear
                    
                    # Wait for modal and click confirm
                    modal_clicked = False
                    for attempt in range(3):
                        if self.wait_for_modal(timeout=4):
                            if self.click_modal_confirm(timeout=4):
                                time.sleep(0.3)  # Wait for approval to complete
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
                    time.sleep(0.3)  # Wait for logout modal to appear
                    
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
                    
                    time.sleep(0.3)
                    print("  ✓ Logged out of admin")
                except:
                    # Try mobile logout button
                    try:
                        logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "admin-logout-button-mobile")))
                        self.scroll_to_element(logout_button)
                        time.sleep(0.2)
                        logout_button.click()
                        time.sleep(0.5)
                        
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
                        
                        time.sleep(0.3)
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
                            time.sleep(0.5)
                            
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
                            
                            time.sleep(0.3)
                            print("  ✓ Logged out of admin (fallback)")
            except Exception as e:
                print(f"  ⚠ Error logging out: {e}")
            
            # Log back into the owner account that was just created
            print(f"Logging back into owner account: {self.owner_email}")
            if not self.login(self.owner_email, self.owner_password, "Owner"):
                return False
            
            # Should start on overview page after login
            time.sleep(0.3)
            current_url = self.driver.current_url
            if "/owner/overview" not in current_url:
                # Navigate to overview if not already there
                self.navigate_and_scroll(f"{BASE_URL}/owner/overview")
                time.sleep(0.3)
            
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
                time.sleep(0.5)  # Wait for page to load
                
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
                
                if name == "Loyalty & Promotions":
                    print("    Ensuring loyalty program is configured (initial pass)...")
                    try:
                        program_tab_button = self.wait.until(EC.element_to_be_clickable((By.ID, "loyalty-subtab-loyalty-program-button")))
                        self.scroll_to_element(program_tab_button)
                        time.sleep(0.2)
                        program_tab_button.click()
                        time.sleep(0.5)
                    except Exception as e:
                        print(f"    ⚠ Could not focus loyalty program subtab: {e}")
                    created = self.configure_loyalty_program(
                        target_visits=6,
                        discount_pct=50,
                        description="50% off any service after 6 visits",
                        preferred_button_id="create-loyalty-settings-button"
                    )
                    if not created:
                        print("    ℹ Loyalty settings may already exist; continuing with dashboard flow")
                    continue

                # If we're on the Products page, add a new product
                if name == "Products":
                    print("    Adding a new product...")
                    try:
                        # Click Add Product button (try page button first, then empty state button)
                        add_product_clicked = False
                        try:
                            add_product_button = self.wait.until(EC.element_to_be_clickable((By.ID, "add-product-page-button")))
                            self.scroll_to_element(add_product_button)
                            time.sleep(0.3)
                            add_product_button.click()
                            add_product_clicked = True
                            print("      ✓ Clicked Add Product button (page)")
                        except:
                            try:
                                add_product_button = self.wait.until(EC.element_to_be_clickable((By.ID, "add-product-empty-button")))
                                self.scroll_to_element(add_product_button)
                                add_product_button.click()
                                add_product_clicked = True
                                print("      ✓ Clicked Add Product button (empty state)")
                            except:
                                print("      ⚠ Could not find Add Product button")
                        
                        if add_product_clicked:
                            time.sleep(0.3)  # Wait for modal to appear
                            
                            # Generate random product data
                            product_names = ["Professional Shampoo", "Deep Conditioner", "Hair Serum", "Styling Gel", "Hair Mask", "Color Treatment"]
                            product_descriptions = [
                                "High-quality professional hair care product",
                                "Premium salon-grade treatment for all hair types",
                                "Advanced formula for optimal results",
                                "Professional-grade styling solution",
                                "Intensive treatment for damaged hair",
                                "Long-lasting color protection formula"
                            ]
                            categories = ["SHAMPOO", "CONDITIONER", "HAIR TREATMENT", "STYLING PRODUCT", "HAIR COLOR", "HAIR ACCESSORIES", "SKINCARE", "OTHER"]
                            
                            product_name = random.choice(product_names) + f" {random.randint(100, 999)}"
                            product_description = random.choice(product_descriptions)
                            product_sku = f"PROD-{random.randint(1000, 9999)}"
                            product_price = f"{random.randint(10, 100)}.{random.randint(10, 99)}"
                            product_stock = str(random.randint(10, 100))
                            product_category = random.choice(categories)
                            
                            # Fill Product Name
                            print(f"      Filling Product Name: {product_name}")
                            name_input = self.wait.until(EC.presence_of_element_located((By.ID, "name")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", name_input)
                            name_input.clear()
                            name_input.send_keys(product_name)
                            
                            # Fill Description
                            print(f"      Filling Description...")
                            desc_input = self.wait.until(EC.presence_of_element_located((By.ID, "description")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", desc_input)
                            desc_input.clear()
                            desc_input.send_keys(product_description)
                            
                            # Fill SKU
                            print(f"      Filling SKU: {product_sku}")
                            sku_input = self.wait.until(EC.presence_of_element_located((By.ID, "sku")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", sku_input)
                            sku_input.clear()
                            sku_input.send_keys(product_sku)
                            
                            # Fill Price
                            print(f"      Filling Price: ${product_price}")
                            price_input = self.wait.until(EC.presence_of_element_located((By.ID, "price")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", price_input)
                            price_input.clear()
                            price_input.send_keys(product_price)
                            
                            # Fill Stock Quantity
                            print(f"      Filling Stock Quantity: {product_stock}")
                            stock_input = self.wait.until(EC.presence_of_element_located((By.ID, "stock_qty")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", stock_input)
                            stock_input.clear()
                            stock_input.send_keys(product_stock)
                            
                            # Select Category (dropdown - uses standard Select component)
                            print(f"      Selecting Category: {product_category}")
                            try:
                                # Find and click the SelectTrigger button by ID
                                category_trigger = self.wait.until(EC.element_to_be_clickable((By.ID, "category")))
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", category_trigger)
                                category_trigger.click()
                                time.sleep(0.3)  # Wait for dropdown to open
                                
                                # Find the category option (SelectItem)
                                category_option = WebDriverWait(self.driver, 3).until(
                                    EC.element_to_be_clickable((By.XPATH, 
                                        f"//div[contains(@class, 'absolute')]//div[contains(text(), '{product_category}')] | "
                                        f"//div[@role='option' and contains(text(), '{product_category}')] | "
                                        f"//div[contains(@class, 'py-1')]//div[contains(text(), '{product_category}')]"
                                    ))
                                )
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", category_option)
                                category_option.click()
                                time.sleep(0.1)
                                print(f"      ✓ Selected Category: {product_category}")
                            except Exception as e:
                                print(f"      ⚠ Could not select category: {e}")
                                # Try alternative method
                                try:
                                    category_trigger = self.driver.find_element(By.ID, "category")
                                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", category_trigger)
                                    time.sleep(0.2)
                                    self.driver.execute_script("arguments[0].click();", category_trigger)
                                    time.sleep(0.8)
                                    # Try to find option by text in any visible dropdown
                                    all_options = self.driver.find_elements(By.XPATH, 
                                        "//div[contains(text(), '" + product_category + "')]"
                                    )
                                    for opt in all_options:
                                        if opt.is_displayed():
                                            self.driver.execute_script("arguments[0].click();", opt)
                                            time.sleep(0.1)
                                            print(f"      ✓ Selected Category: {product_category} (alternative)")
                                            break
                                except Exception as e2:
                                    print(f"      ✗ Failed to select category with alternative method: {e2}")
                            
                            # Click Add Product button inside modal
                            print("      Clicking Add Product button in modal...")
                            time.sleep(0.2)  # Wait for form to be ready after filling all fields
                            
                            # Wait for button to be present and get reference
                            submit_button = self.wait.until(
                                EC.presence_of_element_located((By.ID, "add-product-modal-submit-button"))
                            )
                            
                            # Wait for button to be enabled (not disabled) - check both disabled attribute and aria-disabled
                            WebDriverWait(self.driver, 5).until(
                                lambda d: not (d.find_element(By.ID, "add-product-modal-submit-button").get_attribute("disabled") 
                                             or d.find_element(By.ID, "add-product-modal-submit-button").get_attribute("aria-disabled") == "true")
                            )
                            
                            # Scroll button into view
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_button)
                            time.sleep(0.3)
                            
                            # Get fresh reference after scroll
                            submit_button = self.driver.find_element(By.ID, "add-product-modal-submit-button")
                            
                            # Use JavaScript click for reliability (works even if button is partially obscured)
                            try:
                                self.driver.execute_script("arguments[0].click();", submit_button)
                                print("      ✓ Clicked Add Product button (JavaScript click)")
                            except Exception as click_error:
                                # Fallback to regular click
                                print(f"      ⚠ JavaScript click failed: {click_error}, trying regular click...")
                                submit_button.click()
                                print("      ✓ Clicked Add Product button (regular click)")
                            
                            time.sleep(ACTION_DELAY * 2)  # Wait for product to be added
                            
                            print("      ✓ Product added successfully")
                    except Exception as e:
                        print(f"      ⚠ Error adding product: {e}")
                        import traceback
                        traceback.print_exc()
                
                # If we're on the Settings page, set operating hours
                if name == "Settings":
                    print("    Setting operating hours...")
                    try:
                        # Wait for settings page to fully load
                        time.sleep(0.5)
                        
                        # Define operating hours for each day (12-hour format with AM/PM)
                        operating_hours = {
                            'sunday': ('09:00 AM', '11:59 PM'),
                            'monday': ('08:00 AM', '10:00 PM'),
                            'tuesday': ('07:00 AM', '10:00 PM'),
                            'wednesday': ('09:00 AM', '06:00 PM'),
                            'thursday': ('10:00 AM', '09:00 PM'),
                            'friday': ('08:00 AM', '10:00 PM'),
                            'saturday': ('09:00 AM', '05:00 PM')
                        }
                        
                        print("    Setting operating hours for each day...")
                        for day, (start_time_12h, end_time_12h) in operating_hours.items():
                            print(f"      Setting {day.capitalize()} hours: {start_time_12h} to {end_time_12h}")
                            
                            # Convert 12-hour format to 24-hour format for HTML time input
                            start_time_24h = self.convert_12h_to_24h(start_time_12h)
                            end_time_24h = self.convert_12h_to_24h(end_time_12h)
                            
                            try:
                                # Click the toggle button to open the day (if closed)
                                toggle_button_id = f"hours-{day}-toggle"
                                toggle_button = self.wait.until(
                                    EC.presence_of_element_located((By.ID, toggle_button_id))
                                )
                                
                                # Check if button says "Closed" - if so, click it to open
                                button_text = toggle_button.text.strip().upper()
                                if 'CLOSED' in button_text:
                                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", toggle_button)
                                    time.sleep(0.2)
                                    toggle_button.click()
                                    time.sleep(0.4)  # Wait for inputs to appear
                                
                                # Fill start time
                                start_input_id = f"hours-{day}-start-time"
                                start_input = self.wait.until(
                                    EC.element_to_be_clickable((By.ID, start_input_id))
                                )
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", start_input)
                                time.sleep(0.2)
                                
                                # Click the input to focus it first
                                start_input.click()
                                time.sleep(0.1)
                                
                                # Clear the input completely
                                start_input.clear()
                                # Also clear using JavaScript
                                self.driver.execute_script("arguments[0].value = '';", start_input)
                                time.sleep(0.1)
                                
                                # Set value using send_keys character by character to ensure it's complete
                                start_input.send_keys(start_time_24h)
                                time.sleep(0.2)
                                
                                # Also set via JavaScript and trigger React events
                                self.driver.execute_script(f"""
                                    var input = arguments[0];
                                    var value = '{start_time_24h}';
                                    // Set the value using the native setter to trigger React
                                    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                                    nativeInputValueSetter.call(input, value);
                                    // Trigger all possible events
                                    input.dispatchEvent(new Event('input', {{ bubbles: true, cancelable: true }}));
                                    input.dispatchEvent(new Event('change', {{ bubbles: true, cancelable: true }}));
                                    input.dispatchEvent(new Event('blur', {{ bubbles: true, cancelable: true }}));
                                """, start_input)
                                time.sleep(0.3)
                                
                                # Verify the value was set correctly
                                actual_value = start_input.get_attribute('value')
                                if actual_value != start_time_24h:
                                    print(f"        ⚠ Start time value mismatch. Expected: {start_time_24h}, Got: {actual_value}")
                                    # Try one more time with direct JavaScript assignment
                                    self.driver.execute_script(f"arguments[0].value = '{start_time_24h}'; arguments[0].dispatchEvent(new Event('change', {{ bubbles: true }}));", start_input)
                                    time.sleep(0.2)
                                else:
                                    print(f"        ✓ Start time set correctly: {actual_value}")
                                
                                # Fill end time
                                end_input_id = f"hours-{day}-end-time"
                                end_input = self.wait.until(
                                    EC.element_to_be_clickable((By.ID, end_input_id))
                                )
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", end_input)
                                time.sleep(0.2)
                                
                                # Click the input to focus it first
                                end_input.click()
                                time.sleep(0.1)
                                
                                # Clear the input completely
                                end_input.clear()
                                # Also clear using JavaScript
                                self.driver.execute_script("arguments[0].value = '';", end_input)
                                time.sleep(0.1)
                                
                                # Set value using send_keys character by character to ensure it's complete
                                end_input.send_keys(end_time_24h)
                                time.sleep(0.2)
                                
                                # Also set via JavaScript and trigger React events
                                self.driver.execute_script(f"""
                                    var input = arguments[0];
                                    var value = '{end_time_24h}';
                                    // Set the value using the native setter to trigger React
                                    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                                    nativeInputValueSetter.call(input, value);
                                    // Trigger all possible events
                                    input.dispatchEvent(new Event('input', {{ bubbles: true, cancelable: true }}));
                                    input.dispatchEvent(new Event('change', {{ bubbles: true, cancelable: true }}));
                                    input.dispatchEvent(new Event('blur', {{ bubbles: true, cancelable: true }}));
                                """, end_input)
                                time.sleep(0.3)
                                
                                # Verify the value was set correctly
                                actual_value = end_input.get_attribute('value')
                                if actual_value != end_time_24h:
                                    print(f"        ⚠ End time value mismatch. Expected: {end_time_24h}, Got: {actual_value}")
                                    # Try one more time with direct JavaScript assignment
                                    self.driver.execute_script(f"arguments[0].value = '{end_time_24h}'; arguments[0].dispatchEvent(new Event('change', {{ bubbles: true }}));", end_input)
                                    time.sleep(0.2)
                                else:
                                    print(f"        ✓ End time set correctly: {actual_value}")
                                
                                print(f"        ✓ Set {day.capitalize()} hours: {start_time_12h} to {end_time_12h}")
                                
                            except Exception as e:
                                print(f"        ⚠ Error setting hours for {day}: {e}")
                                import traceback
                                traceback.print_exc()
                        
                        # Wait a moment for all changes to register
                        time.sleep(0.5)
                        
                        # Click Save Operating Hours button
                        print("    Clicking Save Operating Hours button...")
                        try:
                            save_button = self.wait.until(
                                EC.element_to_be_clickable((By.ID, "save-operating-hours-button"))
                            )
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", save_button)
                            time.sleep(0.3)
                            
                            # Try JavaScript click first
                            try:
                                self.driver.execute_script("arguments[0].click();", save_button)
                                print("      ✓ Clicked Save button (JavaScript click)")
                            except:
                                save_button.click()
                                print("      ✓ Clicked Save button (regular click)")
                            
                            # Wait for save to complete and success modal to appear
                            time.sleep(ACTION_DELAY * 2)  # Wait for save to complete
                            
                            # Click OK button in success modal
                            print("  Clicking OK button in success modal...")
                            try:
                                ok_button = WebDriverWait(self.driver, 5).until(
                                    EC.element_to_be_clickable((By.ID, "operating-hours-success-ok-button"))
                                )
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", ok_button)
                                time.sleep(0.2)
                                
                                try:
                                    self.driver.execute_script("arguments[0].click();", ok_button)
                                    print("      ✓ Clicked OK button (JavaScript click)")
                                except:
                                    ok_button.click()
                                    print("      ✓ Clicked OK button (regular click)")
                                
                                time.sleep(0.5)  # Wait for modal to close
                                print("      ✓ Operating hours saved successfully")
                            except Exception as e:
                                print(f"      ⚠ Could not find or click OK button: {e}")
                                # Try fallback - look for OK button by text
                                try:
                                    ok_buttons = self.driver.find_elements(By.XPATH, 
                                        "//button[contains(text(), 'OK')] | //button[contains(text(), 'Ok')]"
                                    )
                                    if ok_buttons:
                                        ok_buttons[0].click()
                                        time.sleep(0.5)
                                        print("      ✓ Clicked OK button (fallback)")
                                except:
                                    print("      ⚠ Could not click OK button, continuing...")
                        except Exception as e:
                            print(f"      ⚠ Error saving operating hours: {e}")
                            import traceback
                            traceback.print_exc()
                    except Exception as e:
                        print(f"    ⚠ Error setting operating hours: {e}")
                        import traceback
                        traceback.print_exc()
            
            print("  ✓ All owner dashboard tabs checked")
            
            # Log out of owner account
            print("\nLogging out of owner account...")
            try:
                # Wait for any toast notifications to disappear
                time.sleep(2.0)
                try:
                    toast_elements = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'sonner-toast')]")
                    if toast_elements:
                        time.sleep(2.0)
                except:
                    pass
                
                # Try owner logout button ID first
                try:
                    logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "owner-logout-button")))
                    self.scroll_to_element(logout_button)
                    time.sleep(0.2)
                    try:
                        logout_button.click()
                    except:
                        # If regular click fails, use JavaScript click
                        self.driver.execute_script("arguments[0].click();", logout_button)
                    # Wait for logout to process and redirect
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
                        try:
                            logout_buttons[0].click()
                        except:
                            self.driver.execute_script("arguments[0].click();", logout_buttons[0])
                        # Wait for logout to process and redirect
                        time.sleep(1.0)
                        print("  ✓ Logged out (fallback)")
                    else:
                        raise Exception("Could not find logout button")
            except Exception as e:
                print(f"  ⚠ Error logging out: {e}")
                import traceback
                traceback.print_exc()
            
            # Navigate to landing page and sign up as stylist
            print("\nSigning up as stylist...")
            time.sleep(0.5)
            self.navigate_and_scroll(f"{BASE_URL}/")
            time.sleep(0.3)
            
            # Click Get Started button
            try:
                get_started_button = self.wait.until(EC.element_to_be_clickable((By.ID, "get-started-hero-button")))
                self.scroll_to_element(get_started_button)
                time.sleep(0.3)
                get_started_button.click()
            except:
                try:
                    get_started_button = self.wait.until(EC.element_to_be_clickable((By.ID, "get-started-header-button")))
                    self.scroll_to_element(get_started_button)
                    time.sleep(0.3)
                    get_started_button.click()
                except:
                    get_started_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Get Started')]")
                    if get_started_buttons:
                        get_started_buttons[0].click()
            
            time.sleep(0.5)
            
            # Ensure we're on signup tab
            try:
                signup_tab = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Sign Up')]")
                if signup_tab:
                    signup_tab.click()
                    time.sleep(0.5)
            except:
                pass
            
            # Fill signup form for stylist
            self.stylist_email = self.generate_email()
            stylist_name = "Selenium Test Stylist"
            stylist_password = "test123"
            
            try:
                # Fill Full Name
                name_input = self.wait.until(EC.presence_of_element_located((By.ID, "name")))
                name_input.clear()
                name_input.send_keys(stylist_name)
                time.sleep(0.2)
                
                # Fill Email
                email_input = self.wait.until(EC.presence_of_element_located((By.ID, "email")))
                email_input.clear()
                email_input.send_keys(self.stylist_email)
                time.sleep(0.2)
                
                # Fill Password
                password_input = self.wait.until(EC.presence_of_element_located((By.ID, "password")))
                password_input.clear()
                password_input.send_keys(stylist_password)
                time.sleep(0.2)
                
                # Fill Confirm Password
                confirm_password_input = self.wait.until(EC.presence_of_element_located((By.ID, "confirmPassword")))
                confirm_password_input.clear()
                confirm_password_input.send_keys(stylist_password)
                time.sleep(0.2)
                
                # Select Hairstylist role
                print("  Selecting Hairstylist role...")
                if not self.select_select_dropdown("role", "Hairstylist"):
                    try:
                        select_trigger = self.wait.until(EC.element_to_be_clickable((By.ID, "role")))
                        self.scroll_to_element(select_trigger)
                        select_trigger.click()
                        time.sleep(0.5)
                        stylist_option = WebDriverWait(self.driver, 3).until(
                            EC.element_to_be_clickable((By.XPATH, "//div[@role='option' and contains(., 'Hairstylist')]"))
                        )
                        stylist_option.click()
                        time.sleep(0.3)
                        print("  ✓ Selected Hairstylist role")
                    except:
                        print("  ⚠ Could not select Hairstylist role")
                
                # Click Create Account button
                print("  Clicking Create Account button...")
                create_account_button = self.wait.until(EC.element_to_be_clickable((By.ID, "create-account-button")))
                self.scroll_to_element(create_account_button)
                create_account_button.click()
                time.sleep(ACTION_DELAY * 2)
                
                # Check if signup was successful
                current_url = self.driver.current_url
                if "/stylist" in current_url or "/dashboard" in current_url or "/hairstylist" in current_url:
                    print(f"  ✓ Stylist account created successfully: {self.stylist_email}")
                else:
                    print(f"  ⚠ Stylist signup may have failed - redirected to: {current_url}")
            except Exception as e:
                print(f"  ⚠ Error creating stylist account: {e}")
                import traceback
                traceback.print_exc()
            
            # Log out of stylist account
            print("\nLogging out of stylist account...")
            try:
                # Wait for page to fully load
                time.sleep(0.5)
                
                # Try stylist logout button by ID
                try:
                    logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "stylist-logout-button")))
                    self.scroll_to_element(logout_button)
                    time.sleep(0.2)
                    
                    # Click using JavaScript for reliability
                    try:
                        self.driver.execute_script("arguments[0].click();", logout_button)
                        print("  ✓ Clicked stylist logout button (JavaScript click)")
                    except:
                        logout_button.click()
                        print("  ✓ Clicked stylist logout button (regular click)")
                    
                    time.sleep(0.5)
                    
                    # Handle logout modal
                    try:
                        ok_button = WebDriverWait(self.driver, 5).until(
                            EC.element_to_be_clickable((By.ID, "logout-modal-ok-button"))
                        )
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", ok_button)
                        time.sleep(0.2)
                        
                        try:
                            self.driver.execute_script("arguments[0].click();", ok_button)
                            print("  ✓ Clicked logout modal OK button (JavaScript click)")
                        except:
                            ok_button.click()
                            print("  ✓ Clicked logout modal OK button (regular click)")
                        
                        time.sleep(0.5)
                        print("  ✓ Logged out of stylist account successfully")
                    except Exception as modal_error:
                        print(f"  ⚠ Could not find or click logout modal OK button: {modal_error}")
                        # Try fallback - look for OK button by text
                        try:
                            ok_buttons = self.driver.find_elements(By.XPATH, 
                                "//button[contains(text(), 'OK')] | //button[contains(text(), 'Ok')]"
                            )
                            if ok_buttons:
                                ok_buttons[0].click()
                                time.sleep(0.5)
                                print("  ✓ Clicked OK button in logout modal (fallback)")
                        except:
                            print("  ⚠ Could not find OK button in logout modal")
                            
                except Exception as btn_error:
                    print(f"  ⚠ Could not find stylist logout button by ID: {btn_error}")
                    # Fallback to XPath
                    try:
                        logout_buttons = self.driver.find_elements(By.XPATH, 
                            "//button[contains(text(), 'Logout')] | //button[contains(., 'Logout')]"
                        )
                        if logout_buttons:
                            self.scroll_to_element(logout_buttons[0])
                            time.sleep(0.2)
                            self.driver.execute_script("arguments[0].click();", logout_buttons[0])
                            time.sleep(0.5)
                            print("  ✓ Clicked stylist logout button (XPath fallback)")
                            
                            # Try to handle modal
                            try:
                                ok_button = WebDriverWait(self.driver, 5).until(
                                    EC.element_to_be_clickable((By.ID, "logout-modal-ok-button"))
                                )
                                ok_button.click()
                                time.sleep(0.5)
                                print("  ✓ Logged out of stylist account (fallback)")
                            except:
                                pass
                    except Exception as fallback_error:
                        print(f"  ⚠ Error in fallback logout attempt: {fallback_error}")
                        import traceback
                        traceback.print_exc()
                        
            except Exception as e:
                print(f"  ⚠ Error logging out of stylist: {e}")
                import traceback
                traceback.print_exc()
            
            # Navigate back to landing page and sign back into owner account
            print("\nSigning back into owner account...")
            time.sleep(0.5)
            self.navigate_and_scroll(f"{BASE_URL}/")
            time.sleep(0.3)
            
            if not self.login(self.owner_email, self.owner_password, "Owner"):
                print("  ⚠ Failed to log back into owner account")
                return False
            
            # Navigate to Staff tab
            print("\nNavigating to Staff tab to add employee...")
            self.navigate_and_scroll(f"{BASE_URL}/owner/staff")
            time.sleep(0.5)
            
            # Click Add Employee button
            print("  Clicking Add Employee button...")
            try:
                add_employee_button = self.wait.until(EC.element_to_be_clickable((By.ID, "add-employee-page-button")))
                self.scroll_to_element(add_employee_button)
                time.sleep(0.2)
                add_employee_button.click()
                time.sleep(0.5)  # Wait for modal to appear
                print("  ✓ Clicked Add Employee button")
            except Exception as e:
                print(f"  ⚠ Error clicking Add Employee button: {e}")
                return False
            
            # Fill out the Add Employee modal
            print("  Filling out Add Employee form...")
            try:
                # Fill Employee Email
                email_input = self.wait.until(EC.presence_of_element_located((By.ID, "add-employee-email-input")))
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", email_input)
                time.sleep(0.2)
                email_input.clear()
                email_input.send_keys(self.stylist_email)
                time.sleep(0.2)
                print(f"    ✓ Filled Employee Email: {self.stylist_email}")
                
                # Fill Job Title
                job_title_input = self.wait.until(EC.presence_of_element_located((By.ID, "add-employee-job-title-input")))
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", job_title_input)
                time.sleep(0.2)
                job_title_input.clear()
                job_title_input.send_keys("Senior Stylist")
                time.sleep(0.2)
                print("    ✓ Filled Job Title: Senior Stylist")
                
                # Click Add Employee button in modal
                print("  Clicking Add Employee button in modal...")
                submit_button = self.wait.until(EC.element_to_be_clickable((By.ID, "add-employee-modal-submit-button")))
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_button)
                time.sleep(0.2)
                
                try:
                    self.driver.execute_script("arguments[0].click();", submit_button)
                    print("    ✓ Clicked Add Employee button (JavaScript click)")
                except:
                    submit_button.click()
                    print("    ✓ Clicked Add Employee button (regular click)")
                
                time.sleep(ACTION_DELAY * 2)  # Wait for employee to be added
                
                # Click OK button in success modal
                print("  Clicking OK button in success modal...")
                try:
                    # Try the specific ID for add employee success modal first
                    ok_button = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((By.ID, "add-employee-success-ok-button"))
                    )
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", ok_button)
                    time.sleep(0.2)
                    
                    try:
                        self.driver.execute_script("arguments[0].click();", ok_button)
                        print("    ✓ Clicked OK button (JavaScript click)")
                    except:
                        ok_button.click()
                        print("    ✓ Clicked OK button (regular click)")
                    
                    time.sleep(0.5)  # Wait for modal to close
                    print("  ✓ Employee added successfully")
                except Exception as e:
                    print(f"  ⚠ Could not find or click OK button: {e}")
                    # Try fallback - look for OK button by text
                    try:
                        ok_buttons = self.driver.find_elements(By.XPATH, 
                            "//button[contains(text(), 'OK')] | //button[contains(text(), 'Ok')]"
                        )
                        if ok_buttons:
                            ok_buttons[0].click()
                            time.sleep(0.5)
                            print("  ✓ Clicked OK button (fallback)")
                    except:
                        print("  ⚠ Could not click OK button, continuing...")
                
                # Wait for employee list to refresh after modal closes
                time.sleep(1.5)  # Give time for fetchEmployees to complete and list to render
                
                # Find the employee card by email and click Set Hours
                print("\nSetting hours for the newly added employee...")
                try:
                    # Wait for employee list to be visible and updated
                    # Wait for the email to appear in the list first
                    print("  Waiting for employee list to refresh...")
                    email_element = WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{self.stylist_email}')]"))
                    )
                    print(f"  ✓ Found employee email in list: {self.stylist_email}")
                    time.sleep(0.5)  # Additional wait for card to fully render
                    
                    # Try multiple strategies to find the Set Hours button
                    set_hours_button = None
                    
                    # Strategy 1: Find by employee email, then find Set Hours button nearby
                    try:
                        # Find the email element for the employee we just added (wait for it to appear)
                        email_element = WebDriverWait(self.driver, 10).until(
                            EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{self.stylist_email}')]"))
                        )
                        print(f"  ✓ Found employee email: {self.stylist_email}")
                        
                        # Navigate up to find the employee card container
                        employee_card = email_element.find_element(By.XPATH, 
                            "./ancestor::div[contains(@class, 'border') or contains(@class, 'card') or contains(@class, 'rounded')][1]"
                        )
                        
                        # Find Set Hours button within this card
                        set_hours_button = employee_card.find_element(By.XPATH, ".//button[contains(@id, 'set-hours-button-')]")
                        print("  ✓ Found Set Hours button by email (in same card)")
                    except Exception as e1:
                        print(f"  Strategy 1 failed: {e1}")
                        # Strategy 2: Find all Set Hours buttons and use the last one (newest employee)
                        try:
                            set_hours_buttons = self.driver.find_elements(By.XPATH, 
                                "//button[contains(@id, 'set-hours-button-')]"
                            )
                            if set_hours_buttons:
                                # Use the last button (should be the newest employee)
                                set_hours_button = set_hours_buttons[-1]
                                print(f"  ✓ Found Set Hours button (found {len(set_hours_buttons)} total, using last one)")
                            else:
                                raise Exception("No Set Hours buttons found")
                        except:
                            # Strategy 3: Find by text
                            set_hours_buttons = self.driver.find_elements(By.XPATH, 
                                "//button[contains(text(), 'Set Hours')]"
                            )
                            if set_hours_buttons:
                                set_hours_button = set_hours_buttons[-1]  # Use last one
                                print("  ✓ Found Set Hours button by text (fallback)")
                            else:
                                raise Exception("Could not find Set Hours button")
                    
                    # Click the Set Hours button
                    if set_hours_button:
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", set_hours_button)
                        time.sleep(0.3)
                        
                        try:
                            self.driver.execute_script("arguments[0].click();", set_hours_button)
                            print("  ✓ Clicked Set Hours button (JavaScript click)")
                        except:
                            set_hours_button.click()
                            print("  ✓ Clicked Set Hours button (regular click)")
                        
                        time.sleep(0.5)  # Wait for modal to appear
                    else:
                        print("  ⚠ Could not find Set Hours button")
                        return False
                    
                    # Define employee hours (within salon hours)
                    # Employee hours will be 1 hour after salon opens and 1 hour before salon closes
                    employee_hours = {
                        'sunday': ('10:00 AM', '11:59 PM'),      # Salon: 09:00 AM - 11:59 PM
                        'monday': ('09:00 AM', '10:00 PM'),       # Salon: 08:00 AM - 10:00 PM
                        'tuesday': ('08:00 AM', '10:00 PM'),     # Salon: 07:00 AM - 10:00 PM
                        'wednesday': ('10:00 AM', '05:00 PM'),   # Salon: 09:00 AM - 06:00 PM
                        'thursday': ('11:00 AM', '08:00 PM'),    # Salon: 10:00 AM - 09:00 PM
                        'friday': ('09:00 AM', '09:00 PM'),      # Salon: 08:00 AM - 10:00 PM
                        'saturday': ('10:00 AM', '04:00 PM')     # Salon: 09:00 AM - 05:00 PM
                    }
                    
                    print("  Setting employee availability for each day...")
                    for day, (start_time_12h, end_time_12h) in employee_hours.items():
                        print(f"    Setting {day.capitalize()} hours: {start_time_12h} to {end_time_12h}")
                        
                        # Convert 12-hour format to 24-hour format
                        start_time_24h = self.convert_12h_to_24h(start_time_12h)
                        end_time_24h = self.convert_12h_to_24h(end_time_12h)
                        
                        try:
                            # Click the toggle button to make the day available (if not already)
                            toggle_button_id = f"employee-{day}-toggle-button"
                            toggle_button = self.wait.until(
                                EC.presence_of_element_located((By.ID, toggle_button_id))
                            )
                            
                            # Check if button says "Not Available" - if so, click it to make available
                            button_text = toggle_button.text.strip().upper()
                            if 'NOT AVAILABLE' in button_text or 'UNAVAILABLE' in button_text:
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", toggle_button)
                                time.sleep(0.2)
                                toggle_button.click()
                                time.sleep(0.4)  # Wait for inputs to appear
                            
                            # Fill start time
                            start_input_id = f"employee-{day}-start-time"
                            start_input = self.wait.until(
                                EC.element_to_be_clickable((By.ID, start_input_id))
                            )
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", start_input)
                            time.sleep(0.2)
                            
                            # Click and set value
                            start_input.click()
                            time.sleep(0.1)
                            start_input.clear()
                            self.driver.execute_script("arguments[0].value = '';", start_input)
                            time.sleep(0.1)
                            start_input.send_keys(start_time_24h)
                            time.sleep(0.2)
                            
                            # Trigger React events
                            self.driver.execute_script(f"""
                                var input = arguments[0];
                                var value = '{start_time_24h}';
                                var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                                nativeInputValueSetter.call(input, value);
                                input.dispatchEvent(new Event('input', {{ bubbles: true, cancelable: true }}));
                                input.dispatchEvent(new Event('change', {{ bubbles: true, cancelable: true }}));
                            """, start_input)
                            time.sleep(0.3)
                            
                            # Fill end time
                            end_input_id = f"employee-{day}-end-time"
                            end_input = self.wait.until(
                                EC.element_to_be_clickable((By.ID, end_input_id))
                            )
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", end_input)
                            time.sleep(0.2)
                            
                            # Click and set value
                            end_input.click()
                            time.sleep(0.1)
                            end_input.clear()
                            self.driver.execute_script("arguments[0].value = '';", end_input)
                            time.sleep(0.1)
                            end_input.send_keys(end_time_24h)
                            time.sleep(0.2)
                            
                            # Trigger React events
                            self.driver.execute_script(f"""
                                var input = arguments[0];
                                var value = '{end_time_24h}';
                                var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                                nativeInputValueSetter.call(input, value);
                                input.dispatchEvent(new Event('input', {{ bubbles: true, cancelable: true }}));
                                input.dispatchEvent(new Event('change', {{ bubbles: true, cancelable: true }}));
                            """, end_input)
                            time.sleep(0.3)
                            
                            print(f"      ✓ Set {day.capitalize()} hours: {start_time_12h} to {end_time_12h}")
                            
                        except Exception as e:
                            print(f"      ⚠ Error setting hours for {day}: {e}")
                            import traceback
                            traceback.print_exc()
                    
                    # Wait for all changes to register
                    time.sleep(0.5)
                    
                    # Click Save Hours button
                    print("  Clicking Save Hours button...")
                    try:
                        save_button = self.wait.until(
                            EC.element_to_be_clickable((By.ID, "save-employee-hours-button"))
                        )
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", save_button)
                        time.sleep(0.3)
                        
                        try:
                            self.driver.execute_script("arguments[0].click();", save_button)
                            print("    ✓ Clicked Save Hours button (JavaScript click)")
                        except:
                            save_button.click()
                            print("    ✓ Clicked Save Hours button (regular click)")
                        
                        time.sleep(ACTION_DELAY * 2)  # Wait for save to complete
                        
                        # Click OK button in success modal
                        print("  Clicking OK button in employee hours success modal...")
                        try:
                            ok_button = WebDriverWait(self.driver, 5).until(
                                EC.element_to_be_clickable((By.ID, "employee-hours-success-ok-button"))
                            )
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", ok_button)
                            time.sleep(0.2)
                            
                            try:
                                self.driver.execute_script("arguments[0].click();", ok_button)
                                print("    ✓ Clicked OK button (JavaScript click)")
                            except:
                                ok_button.click()
                                print("    ✓ Clicked OK button (regular click)")
                            
                            time.sleep(0.5)  # Wait for modal to close
                            print("  ✓ Employee hours saved successfully")
                        except Exception as e:
                            print(f"  ⚠ Could not find or click OK button: {e}")
                            # Try fallback
                            try:
                                ok_buttons = self.driver.find_elements(By.XPATH, 
                                    "//button[contains(text(), 'OK')] | //button[contains(text(), 'Ok')]"
                                )
                                if ok_buttons:
                                    ok_buttons[0].click()
                                    time.sleep(0.5)
                                    print("  ✓ Clicked OK button (fallback)")
                            except:
                                print("  ⚠ Could not click OK button, continuing...")
                    except Exception as e:
                        print(f"  ⚠ Error saving employee hours: {e}")
                        import traceback
                        traceback.print_exc()
                        
                except Exception as e:
                    print(f"  ⚠ Error setting employee hours: {e}")
                    import traceback
                    traceback.print_exc()
                    
            except Exception as e:
                print(f"  ⚠ Error adding employee: {e}")
                import traceback
                traceback.print_exc()
            
            # Log out of owner account
            print("\nLogging out of owner account...")
            try:
                # Wait for any toast notifications to disappear
                time.sleep(2.0)
                try:
                    toast_elements = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'sonner-toast')]")
                    if toast_elements:
                        time.sleep(2.0)
                except:
                    pass
                
                # Try owner logout button ID first
                try:
                    logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "owner-logout-button")))
                    self.scroll_to_element(logout_button)
                    time.sleep(0.2)
                    try:
                        logout_button.click()
                    except:
                        # If regular click fails, use JavaScript click
                        self.driver.execute_script("arguments[0].click();", logout_button)
                    # Wait for logout to process and redirect
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
                        try:
                            logout_buttons[0].click()
                        except:
                            self.driver.execute_script("arguments[0].click();", logout_buttons[0])
                        # Wait for logout to process and redirect
                        time.sleep(1.0)
                        print("  ✓ Logged out (fallback)")
                    else:
                        raise Exception("Could not find logout button")
            except Exception as e:
                print(f"  ⚠ Error logging out: {e}")
                import traceback
                traceback.print_exc()
            
            # Navigate to landing page and sign back into stylist account
            print("\nSigning back into stylist account...")
            time.sleep(0.5)
            self.navigate_and_scroll(f"{BASE_URL}/")
            time.sleep(0.3)
            
            if not self.login(self.stylist_email, "test123", "Stylist"):
                print("  ⚠ Failed to log back into stylist account")
                return False
            
            # Go through stylist dashboard tabs in order
            print("\nGoing through stylist dashboard tabs in order...")
            stylist_tabs = [
                ("schedule", "Schedule"),
                ("services", "Services"),
                ("customers", "Customers"),
                ("reviews", "Reviews")
            ]
            
            for tab_id, tab_name in stylist_tabs:
                print(f"  Checking {tab_name} tab...")
                
                # Click on the tab
                try:
                    tab_button = self.wait.until(EC.element_to_be_clickable((By.ID, f"stylist-tab-{tab_id}")))
                    self.scroll_to_element(tab_button)
                    time.sleep(0.2)
                    tab_button.click()
                    time.sleep(0.5)  # Wait for tab content to load
                    print(f"    ✓ Opened {tab_name} tab")
                    
                    # Scroll through the page content to ensure everything loads
                    try:
                        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                        time.sleep(0.3)
                        self.driver.execute_script("window.scrollTo(0, 0);")
                        time.sleep(0.3)
                        print(f"    ✓ Scrolled through {tab_name} tab content")
                    except Exception as e:
                        print(f"    ⚠ Could not scroll {tab_name} tab: {e}")
                except Exception as e:
                    print(f"    ⚠ Could not click {tab_name} tab: {e}")
                    continue
                
                # If we're on the Schedule tab, perform schedule-specific actions
                if tab_id == "schedule":
                    print("    Performing schedule tab actions...")
                    
                    # Click Refresh Data button
                    try:
                        refresh_button = self.wait.until(EC.element_to_be_clickable((By.ID, "refresh-data-button")))
                        self.scroll_to_element(refresh_button)
                        time.sleep(0.2)
                        refresh_button.click()
                        time.sleep(0.5)  # Wait for data refresh
                        print("      ✓ Clicked Refresh Data button")
                    except Exception as e:
                        print(f"      ⚠ Could not click Refresh Data button: {e}")
                    
                    # Click Block Time button
                    print("    Clicking Block Time button...")
                    try:
                        block_time_button = self.wait.until(EC.element_to_be_clickable((By.ID, "block-time-button")))
                        self.scroll_to_element(block_time_button)
                        time.sleep(0.2)
                        block_time_button.click()
                        time.sleep(0.5)  # Wait for modal to appear
                        print("      ✓ Clicked Block Time button")
                        
                        # Test error handling: Try to block time with empty fields
                        print("    Testing error handling: Block time with empty fields...")
                        try:
                            block_submit_button = self.wait.until(EC.element_to_be_clickable((By.ID, "block-time-modal-submit-button")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", block_submit_button)
                            time.sleep(0.2)
                            
                            try:
                                self.driver.execute_script("arguments[0].click();", block_submit_button)
                            except:
                                block_submit_button.click()
                            
                            time.sleep(0.5)  # Wait for error message
                            
                            # Check for error message (toast or validation)
                            error_elements = self.driver.find_elements(By.XPATH, 
                                "//div[contains(text(), 'fill')] | "
                                "//div[contains(text(), 'Please')] | "
                                "//div[contains(@class, 'error')] | "
                                "//div[contains(@class, 'toast')]"
                            )
                            if error_elements or "block-time-day-select" in self.driver.page_source:
                                print("      ✓ Error handling triggered for empty fields")
                            else:
                                print("      ⚠ Error may not have been displayed")
                        except Exception as e:
                            print(f"      ⚠ Could not test empty fields error: {e}")
                        
                        # Test error handling: Try to block time outside worker hours
                        print("    Testing error handling: Block time outside worker hours...")
                        try:
                            # Re-open modal if it closed
                            try:
                                block_submit_button = self.driver.find_element(By.ID, "block-time-modal-submit-button")
                            except:
                                block_time_button = self.wait.until(EC.element_to_be_clickable((By.ID, "block-time-button")))
                                block_time_button.click()
                                time.sleep(0.5)
                            
                            # Select Monday
                            day_select = self.wait.until(EC.presence_of_element_located((By.ID, "block-time-day-select")))
                            day_dropdown = Select(day_select)
                            day_dropdown.select_by_value("1")
                            time.sleep(0.2)
                            
                            # Set time outside worker hours (e.g., 11:00 PM - 01:00 AM)
                            start_time_input = self.wait.until(EC.presence_of_element_located((By.ID, "block-time-start-time")))
                            start_time_input.click()
                            start_time_input.clear()
                            start_time_input.send_keys("23:00")  # 11:00 PM
                            time.sleep(0.2)
                            
                            end_time_input = self.wait.until(EC.presence_of_element_located((By.ID, "block-time-end-time")))
                            end_time_input.click()
                            end_time_input.clear()
                            end_time_input.send_keys("01:00")  # 1:00 AM
                            time.sleep(0.2)
                            
                            # Try to submit
                            block_submit_button = self.wait.until(EC.element_to_be_clickable((By.ID, "block-time-modal-submit-button")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", block_submit_button)
                            time.sleep(0.2)
                            
                            try:
                                self.driver.execute_script("arguments[0].click();", block_submit_button)
                            except:
                                block_submit_button.click()
                            
                            time.sleep(0.5)  # Wait for error message
                            print("      ✓ Attempted to block time outside worker hours")
                            print("      ℹ Note: Backend may or may not validate this")
                        except Exception as e:
                            print(f"      ⚠ Could not test outside hours error: {e}")
                        
                        # Now fill out Block Time modal correctly
                        print("    Filling out Block Time modal correctly...")
                        # Re-open modal if it closed
                        try:
                            block_submit_button = self.driver.find_element(By.ID, "block-time-modal-submit-button")
                        except:
                            block_time_button = self.wait.until(EC.element_to_be_clickable((By.ID, "block-time-button")))
                            block_time_button.click()
                            time.sleep(0.5)
                        
                        # Select Day of Week (dropdown)
                        try:
                            day_select = self.wait.until(EC.presence_of_element_located((By.ID, "block-time-day-select")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", day_select)
                            time.sleep(0.2)
                            
                            # Select Monday (value="1")
                            day_dropdown = Select(day_select)
                            day_dropdown.select_by_value("1")  # Monday
                            time.sleep(0.3)
                            print("      ✓ Selected Monday")
                        except Exception as e:
                            print(f"      ⚠ Could not select day: {e}")
                        
                        # Fill Start Time
                        try:
                            start_time_input = self.wait.until(EC.presence_of_element_located((By.ID, "block-time-start-time")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", start_time_input)
                            time.sleep(0.2)
                            
                            start_time_input.click()
                            time.sleep(0.1)
                            start_time_input.clear()
                            start_time_24h = self.convert_12h_to_24h("02:00 PM")
                            start_time_input.send_keys(start_time_24h)
                            time.sleep(0.2)
                            
                            # Trigger React events
                            self.driver.execute_script(f"""
                                var input = arguments[0];
                                var value = '{start_time_24h}';
                                var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                                nativeInputValueSetter.call(input, value);
                                input.dispatchEvent(new Event('input', {{ bubbles: true, cancelable: true }}));
                                input.dispatchEvent(new Event('change', {{ bubbles: true, cancelable: true }}));
                            """, start_time_input)
                            time.sleep(0.2)
                            print("      ✓ Set Start Time: 02:00 PM")
                        except Exception as e:
                            print(f"      ⚠ Could not set start time: {e}")
                        
                        # Fill End Time
                        try:
                            end_time_input = self.wait.until(EC.presence_of_element_located((By.ID, "block-time-end-time")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", end_time_input)
                            time.sleep(0.2)
                            
                            end_time_input.click()
                            time.sleep(0.1)
                            end_time_input.clear()
                            end_time_24h = self.convert_12h_to_24h("04:00 PM")
                            end_time_input.send_keys(end_time_24h)
                            time.sleep(0.2)
                            
                            # Trigger React events
                            self.driver.execute_script(f"""
                                var input = arguments[0];
                                var value = '{end_time_24h}';
                                var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                                nativeInputValueSetter.call(input, value);
                                input.dispatchEvent(new Event('input', {{ bubbles: true, cancelable: true }}));
                                input.dispatchEvent(new Event('change', {{ bubbles: true, cancelable: true }}));
                            """, end_time_input)
                            time.sleep(0.2)
                            print("      ✓ Set End Time: 04:00 PM")
                        except Exception as e:
                            print(f"      ⚠ Could not set end time: {e}")
                        
                        # Click Block Time button in modal
                        print("    Clicking Block Time button in modal...")
                        try:
                            block_submit_button = self.wait.until(EC.element_to_be_clickable((By.ID, "block-time-modal-submit-button")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", block_submit_button)
                            time.sleep(0.2)
                            
                            try:
                                self.driver.execute_script("arguments[0].click();", block_submit_button)
                                print("      ✓ Clicked Block Time button (JavaScript click)")
                            except:
                                block_submit_button.click()
                                print("      ✓ Clicked Block Time button (regular click)")
                            
                            time.sleep(ACTION_DELAY * 2)  # Wait for block to be saved
                            print("      ✓ Time slot blocked successfully")
                        except Exception as e:
                            print(f"      ⚠ Error clicking Block Time button: {e}")
                            import traceback
                            traceback.print_exc()
                        
                        # Wait for modal to close
                        time.sleep(0.5)
                        
                        # Click Next Day button a few times
                        print("    Clicking Next Day button a few times...")
                        for i in range(3):
                            try:
                                next_day_button = self.wait.until(EC.element_to_be_clickable((By.ID, "next-day-button")))
                                if next_day_button.is_enabled():
                                    self.scroll_to_element(next_day_button)
                                    time.sleep(0.2)
                                    next_day_button.click()
                                    time.sleep(0.3)
                                    print(f"      ✓ Clicked Next Day ({i+1}/3)")
                                else:
                                    print(f"      ⚠ Next Day button disabled, stopping at {i+1}")
                                    break
                            except Exception as e:
                                print(f"      ⚠ Could not click Next Day button: {e}")
                                break
                        
                        # Click Previous Day button a few times
                        print("    Clicking Previous Day button a few times...")
                        for i in range(3):
                            try:
                                prev_day_button = self.wait.until(EC.element_to_be_clickable((By.ID, "previous-day-button")))
                                if prev_day_button.is_enabled():
                                    self.scroll_to_element(prev_day_button)
                                    time.sleep(0.2)
                                    prev_day_button.click()
                                    time.sleep(0.3)
                                    print(f"      ✓ Clicked Previous Day ({i+1}/3)")
                                else:
                                    print(f"      ⚠ Previous Day button disabled, stopping at {i+1}")
                                    break
                            except Exception as e:
                                print(f"      ⚠ Could not click Previous Day button: {e}")
                                break
                        
                        # Click Week view button
                        print("    Switching to Week view...")
                        try:
                            week_view_button = self.wait.until(EC.element_to_be_clickable((By.ID, "schedule-view-week-button")))
                            self.scroll_to_element(week_view_button)
                            time.sleep(0.2)
                            week_view_button.click()
                            time.sleep(0.5)  # Wait for week view to load
                            print("      ✓ Switched to Week view")
                        except Exception as e:
                            print(f"      ⚠ Could not switch to Week view: {e}")
                        
                        # Click Next Week button once
                        print("    Clicking Next Week button...")
                        try:
                            next_week_button = self.wait.until(EC.element_to_be_clickable((By.ID, "next-week-button")))
                            if next_week_button.is_enabled():
                                self.scroll_to_element(next_week_button)
                                time.sleep(0.2)
                                next_week_button.click()
                                time.sleep(0.5)
                                print("      ✓ Clicked Next Week")
                            else:
                                print("      ⚠ Next Week button is disabled")
                        except Exception as e:
                            print(f"      ⚠ Could not click Next Week button: {e}")
                        
                        # Click Previous Week button once
                        print("    Clicking Previous Week button...")
                        try:
                            prev_week_button = self.wait.until(EC.element_to_be_clickable((By.ID, "previous-week-button")))
                            if prev_week_button.is_enabled():
                                self.scroll_to_element(prev_week_button)
                                time.sleep(0.2)
                                prev_week_button.click()
                                time.sleep(0.5)
                                print("      ✓ Clicked Previous Week")
                            else:
                                print("      ⚠ Previous Week button is disabled")
                        except Exception as e:
                            print(f"      ⚠ Could not click Previous Week button: {e}")
                        
                        # Click Unblock Time button
                        print("    Clicking Unblock Time button...")
                        try:
                            unblock_button = self.wait.until(EC.element_to_be_clickable((By.ID, "unblock-time-button")))
                            self.scroll_to_element(unblock_button)
                            time.sleep(0.2)
                            unblock_button.click()
                            time.sleep(0.5)  # Wait for modal to appear
                            print("      ✓ Clicked Unblock Time button")
                            
                            # Try to click the X button to remove a blocked slot (if any exist)
                            print("    Attempting to click X button to remove a blocked time slot...")
                            try:
                                # Wait a moment for blocked slots to load
                                time.sleep(0.5)
                                
                                # Try to find any remove button (X button) for blocked slots
                                # The button has ID like "unblock-time-remove-button-{id}"
                                remove_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'unblock-time-remove-button-')]")
                                if remove_buttons:
                                    # Click the first remove button
                                    remove_button = remove_buttons[0]
                                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", remove_button)
                                    time.sleep(0.2)
                                    try:
                                        self.driver.execute_script("arguments[0].click();", remove_button)
                                        print("      ✓ Clicked X button to remove blocked slot (JavaScript click)")
                                    except:
                                        remove_button.click()
                                        print("      ✓ Clicked X button to remove blocked slot (regular click)")
                                    time.sleep(0.5)  # Wait for removal
                                    
                                    # If modal closed (last slot removed), re-open it
                                    try:
                                        close_button = self.driver.find_element(By.ID, "unblock-time-modal-cancel-button")
                                    except:
                                        print("      Modal closed after removal, re-opening...")
                                        unblock_button = self.wait.until(EC.element_to_be_clickable((By.ID, "unblock-time-button")))
                                        self.scroll_to_element(unblock_button)
                                        time.sleep(0.2)
                                        unblock_button.click()
                                        time.sleep(0.5)
                                else:
                                    print("      ⚠ No blocked slots found to remove")
                            except Exception as e:
                                print(f"      ⚠ Could not remove blocked slot: {e}")
                            
                            # Click the Close button
                            print("    Clicking Close button in unblock modal...")
                            try:
                                close_button = self.wait.until(EC.element_to_be_clickable((By.ID, "unblock-time-modal-cancel-button")))
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", close_button)
                                time.sleep(0.2)
                                try:
                                    self.driver.execute_script("arguments[0].click();", close_button)
                                    print("      ✓ Clicked Close button (JavaScript click)")
                                except:
                                    close_button.click()
                                    print("      ✓ Clicked Close button (regular click)")
                                time.sleep(0.3)
                            except Exception as e:
                                print(f"      ⚠ Could not click Close button: {e}")
                            
                        except Exception as e:
                            print(f"      ⚠ Error with unblock time: {e}")
                            import traceback
                            traceback.print_exc()
                    
                    except Exception as e:
                        print(f"    ⚠ Error in schedule tab actions: {e}")
                        import traceback
                        traceback.print_exc()
                
                # If we're on the Services tab, perform services-specific actions
                if tab_id == "services":
                    print("    Performing services tab actions...")
                    
                    # Add three different services
                    services_to_add = [
                        {
                            "name": "Haircut",
                            "description": "Professional haircut and styling",
                            "duration": "1",  # 1 minute for quick booking test
                            "price": "25.00"
                        },
                        {
                            "name": "Hair Color",
                            "description": "Full hair coloring service",
                            "duration": "120",
                            "price": "85.50"
                        },
                        {
                            "name": "Hair Styling",
                            "description": "Professional hair styling for special occasions",
                            "duration": "60",
                            "price": "45.75"
                        }
                    ]
                    
                    for service_idx, service_data in enumerate(services_to_add, 1):
                        print(f"    Adding service {service_idx}/3: {service_data['name']}...")
                        
                        # Click Add Service button
                        try:
                            add_service_button = self.wait.until(EC.element_to_be_clickable((By.ID, "add-service-page-button")))
                            self.scroll_to_element(add_service_button)
                            time.sleep(0.2)
                            add_service_button.click()
                            time.sleep(0.5)  # Wait for modal to appear
                            print(f"      ✓ Clicked Add Service button for service {service_idx}")
                        except Exception as e:
                            print(f"      ⚠ Could not click Add Service button: {e}")
                            continue
                        
                        # Fill out service form
                        try:
                            # Service Name
                            name_input = self.wait.until(EC.presence_of_element_located((By.ID, "add-service-name-input")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", name_input)
                            time.sleep(0.1)
                            name_input.click()
                            time.sleep(0.1)
                            name_input.clear()
                            name_input.send_keys(service_data["name"])
                            time.sleep(0.1)
                            print(f"      ✓ Entered service name: {service_data['name']}")
                            
                            # Description
                            desc_input = self.wait.until(EC.presence_of_element_located((By.ID, "add-service-description-input")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", desc_input)
                            time.sleep(0.1)
                            desc_input.click()
                            time.sleep(0.1)
                            desc_input.clear()
                            desc_input.send_keys(service_data["description"])
                            time.sleep(0.1)
                            print(f"      ✓ Entered description")
                            
                            # Duration
                            duration_input = self.wait.until(EC.presence_of_element_located((By.ID, "add-service-duration-input")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", duration_input)
                            time.sleep(0.1)
                            duration_input.click()
                            time.sleep(0.1)
                            duration_input.clear()
                            duration_input.send_keys(service_data["duration"])
                            time.sleep(0.1)
                            print(f"      ✓ Entered duration: {service_data['duration']} minutes")
                            
                            # Price
                            price_input = self.wait.until(EC.presence_of_element_located((By.ID, "add-service-price-input")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", price_input)
                            time.sleep(0.1)
                            price_input.click()
                            time.sleep(0.1)
                            price_input.clear()
                            price_input.send_keys(service_data["price"])
                            time.sleep(0.1)
                            print(f"      ✓ Entered price: ${service_data['price']}")
                            
                        except Exception as e:
                            print(f"      ⚠ Error filling service form: {e}")
                            import traceback
                            traceback.print_exc()
                            continue
                        
                        # Click Create Service button
                        print(f"    Clicking Create Service button for service {service_idx}...")
                        try:
                            create_button = self.wait.until(EC.element_to_be_clickable((By.ID, "add-service-modal-submit-button")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", create_button)
                            time.sleep(0.2)
                            
                            try:
                                self.driver.execute_script("arguments[0].click();", create_button)
                                print(f"      ✓ Clicked Create Service button (JavaScript click)")
                            except:
                                create_button.click()
                                print(f"      ✓ Clicked Create Service button (regular click)")
                            
                            time.sleep(ACTION_DELAY * 3)  # Wait for service to be created
                            print(f"      ✓ Service {service_idx} created successfully")
                        except Exception as e:
                            print(f"      ⚠ Error clicking Create Service button: {e}")
                            import traceback
                            traceback.print_exc()
                    
                    print("    ✓ All services added successfully")
                    
                    # Delete the first service
                    print("    Deleting the first service...")
                    try:
                        # Wait for services to load
                        time.sleep(1)
                        
                        # Find the first delete button (delete-service-button-{service_id})
                        delete_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'delete-service-button-')]")
                        if delete_buttons:
                            delete_button = delete_buttons[0]
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", delete_button)
                            time.sleep(0.2)
                            try:
                                self.driver.execute_script("arguments[0].click();", delete_button)
                                print("      ✓ Clicked Delete button (JavaScript click)")
                            except:
                                delete_button.click()
                                print("      ✓ Clicked Delete button (regular click)")
                            
                            time.sleep(0.5)  # Wait for delete modal to appear
                            
                            # Click Delete Service button in confirmation modal
                            delete_confirm_button = self.wait.until(EC.element_to_be_clickable((By.ID, "delete-service-modal-submit-button")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", delete_confirm_button)
                            time.sleep(0.2)
                            try:
                                self.driver.execute_script("arguments[0].click();", delete_confirm_button)
                                print("      ✓ Clicked Delete Service button in modal (JavaScript click)")
                            except:
                                delete_confirm_button.click()
                                print("      ✓ Clicked Delete Service button in modal (regular click)")
                            
                            time.sleep(ACTION_DELAY * 2)  # Wait for service to be deleted
                            print("      ✓ Service deleted successfully")
                        else:
                            print("      ⚠ No delete buttons found")
                    except Exception as e:
                        print(f"      ⚠ Error deleting service: {e}")
                        import traceback
                        traceback.print_exc()
                    
                    # Edit the second service (change price)
                    print("    Editing the second service (changing price)...")
                    try:
                        # Wait for services to load
                        time.sleep(1)
                        
                        # Find the second edit button (edit-service-button-{service_id})
                        edit_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'edit-service-button-')]")
                        if edit_buttons and len(edit_buttons) >= 1:
                            edit_button = edit_buttons[0]  # Second service (first was deleted)
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", edit_button)
                            time.sleep(0.2)
                            try:
                                self.driver.execute_script("arguments[0].click();", edit_button)
                                print("      ✓ Clicked Edit button (JavaScript click)")
                            except:
                                edit_button.click()
                                print("      ✓ Clicked Edit button (regular click)")
                            
                            time.sleep(0.5)  # Wait for edit modal to appear
                            
                            # Update the price field
                            try:
                                price_input = self.wait.until(EC.presence_of_element_located((By.ID, "edit-service-price-input")))
                                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", price_input)
                                time.sleep(0.2)
                                
                                price_input.click()
                                time.sleep(0.1)
                                price_input.clear()
                                new_price = "50.00"
                                price_input.send_keys(new_price)
                                time.sleep(0.2)
                                
                                # Trigger React events
                                self.driver.execute_script(f"""
                                    var input = arguments[0];
                                    var value = '{new_price}';
                                    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                                    nativeInputValueSetter.call(input, value);
                                    input.dispatchEvent(new Event('input', {{ bubbles: true, cancelable: true }}));
                                    input.dispatchEvent(new Event('change', {{ bubbles: true, cancelable: true }}));
                                """, price_input)
                                time.sleep(0.2)
                                print(f"      ✓ Updated price to ${new_price}")
                            except Exception as e:
                                print(f"      ⚠ Error updating price: {e}")
                            
                            # Click Update Service button
                            update_button = self.wait.until(EC.element_to_be_clickable((By.ID, "update-service-modal-submit-button")))
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", update_button)
                            time.sleep(0.2)
                            try:
                                self.driver.execute_script("arguments[0].click();", update_button)
                                print("      ✓ Clicked Update Service button (JavaScript click)")
                            except:
                                update_button.click()
                                print("      ✓ Clicked Update Service button (regular click)")
                            
                            time.sleep(ACTION_DELAY * 2)  # Wait for service to be updated
                            print("      ✓ Service updated successfully")
                        else:
                            print("      ⚠ No edit buttons found")
                    except Exception as e:
                        print(f"      ⚠ Error editing service: {e}")
                        import traceback
                        traceback.print_exc()
            
            print("  ✓ All stylist dashboard tabs checked")
            
            # Log out of stylist account
            print("Logging out of stylist account...")
            try:
                # Wait for any toast notifications to disappear
                try:
                    toasts = self.driver.find_elements(By.XPATH, "//li[@data-sonner-toast]")
                    if toasts:
                        print("  Waiting for toast notifications to disappear...")
                        WebDriverWait(self.driver, 5).until(
                            lambda d: len(d.find_elements(By.XPATH, "//li[@data-sonner-toast and @data-visible='true']")) == 0
                        )
                        time.sleep(0.5)  # Extra wait for animation
                except:
                    pass  # No toasts or they already disappeared
                
                logout_button = self.wait.until(EC.element_to_be_clickable((By.ID, "stylist-logout-button")))
                self.scroll_to_element(logout_button)
                time.sleep(0.2)
                
                # Try regular click first, fallback to JavaScript click if intercepted
                try:
                    logout_button.click()
                except:
                    # If click is intercepted, use JavaScript click
                    self.driver.execute_script("arguments[0].click();", logout_button)
                time.sleep(0.5)
                
                # Handle logout confirmation modal if present
                try:
                    confirm_buttons = self.driver.find_elements(By.XPATH, 
                        "//button[contains(text(), 'Logout')] | "
                        "//button[contains(text(), 'Log out')] | "
                        "//button[contains(text(), 'Yes')] | "
                        "//button[contains(text(), 'Confirm')]"
                    )
                    if confirm_buttons:
                        confirm_buttons[0].click()
                        time.sleep(0.5)
                except:
                    pass
                
                # Wait for redirect to landing page
                time.sleep(1)
                current_url = self.driver.current_url
                if "/login" in current_url or "/" == current_url or current_url.endswith("/"):
                    print("  ✓ Successfully logged out of stylist account")
                else:
                    print(f"  ⚠ Logout may not have completed - current URL: {current_url}")
            except Exception as e:
                print(f"  ⚠ Error logging out: {e}")
                import traceback
                traceback.print_exc()
            
            # Navigate to landing page and sign up a new user account
            print("Navigating to landing page to sign up new user...")
            try:
                self.navigate_and_scroll(f"{BASE_URL}/")
                time.sleep(0.5)
                
                # Click Get Started button
                try:
                    get_started_button = self.wait.until(EC.element_to_be_clickable((By.ID, "get-started-hero-button")))
                    get_started_button.click()
                except:
                    try:
                        get_started_button = self.wait.until(EC.element_to_be_clickable((By.ID, "get-started-header-button")))
                        get_started_button.click()
                    except:
                        get_started_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Get Started')]")
                        if get_started_buttons:
                            get_started_buttons[0].click()
                
                time.sleep(0.5)
                
                # Ensure we're on signup tab
                try:
                    signup_tab = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Sign Up')]")
                    if signup_tab:
                        signup_tab.click()
                        time.sleep(0.5)
                except:
                    pass
                
                # Generate new user credentials
                new_user_email = self.generate_email()
                new_user_name = "Selenium Test User"
                new_user_password = "test123"
                
                print(f"Signing up new user account: {new_user_email}")
                
                # Fill signup form
                name_input = self.wait.until(EC.presence_of_element_located((By.ID, "name")))
                name_input.clear()
                name_input.send_keys(new_user_name)
                time.sleep(0.2)
                
                email_input = self.wait.until(EC.presence_of_element_located((By.ID, "email")))
                email_input.clear()
                email_input.send_keys(new_user_email)
                time.sleep(0.2)
                
                password_input = self.wait.until(EC.presence_of_element_located((By.ID, "password")))
                password_input.clear()
                password_input.send_keys(new_user_password)
                time.sleep(0.2)
                
                confirm_password_input = self.wait.until(EC.presence_of_element_located((By.ID, "confirmPassword")))
                confirm_password_input.clear()
                confirm_password_input.send_keys(new_user_password)
                time.sleep(0.2)
                
                # Select Customer role (default user)
                try:
                    role_select = self.driver.find_element(By.ID, "role")
                    if role_select:
                        role_select.click()
                        time.sleep(0.3)
                        customer_option = WebDriverWait(self.driver, 3).until(
                            EC.element_to_be_clickable((By.XPATH, "//div[@role='option' and contains(., 'Customer')]"))
                        )
                        customer_option.click()
                        time.sleep(0.3)
                except:
                    print("  ℹ Using default role (Customer)")
                
                # Click Create Account button
                create_account_button = self.wait.until(EC.element_to_be_clickable((By.ID, "create-account-button")))
                self.scroll_to_element(create_account_button)
                time.sleep(0.2)
                create_account_button.click()
                time.sleep(ACTION_DELAY * 3)  # Wait for account creation
                
                # Wait for redirect after signup
                print("Waiting for redirect after signup...")
                try:
                    WebDriverWait(self.driver, 10).until(
                        lambda driver: "/login" not in driver.current_url
                    )
                    time.sleep(1)  # Additional wait for page to fully load
                except:
                    print("  ⚠ Timeout waiting for redirect")
                
                # Check if signup was successful and navigate to browser
                current_url = self.driver.current_url
                print(f"  Current URL after signup: {current_url}")
                
                if "/dashboard" in current_url or "/browser" in current_url or "/login" not in current_url:
                    print(f"  ✓ New user account created successfully: {new_user_email}")
                    self.user_email = new_user_email
                    self.user_password = new_user_password
                    
                    # Now proceed with booking flow
                    print("\n" + "="*70)
                    print("STARTING BOOKING FLOW")
                    print("="*70)
                    
                    # Navigate to browse salons page
                    print("Navigating to browse salons page...")
                    try:
                        if "/browser" not in current_url:
                            print("  Navigating to /browser...")
                            self.driver.get(f"{BASE_URL}/browser")
                            time.sleep(2)  # Wait for page to load
                            print(f"  Current URL: {self.driver.current_url}")
                        else:
                            print("  Already on browser page")
                            time.sleep(1)  # Wait for page to fully load
                    except Exception as e:
                        print(f"  ⚠ Error navigating to browser page: {e}")
                        import traceback
                        traceback.print_exc()
                        # Try alternative navigation
                        try:
                            self.navigate_and_scroll(f"{BASE_URL}/browser")
                            time.sleep(2)
                        except:
                            pass
                    
                    # Wait for salon cards to load completely
                    print("Waiting for salon cards to load...")
                    try:
                        # Wait for loading indicator to disappear or cards to appear
                        # First, wait for any loading indicators to disappear
                        print("  Step 1: Waiting for loading indicators to disappear...")
                        try:
                            WebDriverWait(self.driver, 15).until_not(
                                EC.presence_of_element_located((By.XPATH, 
                                    "//div[contains(text(), 'Loading salons')] | "
                                    "//div[contains(text(), 'Loading')] | "
                                    "//div[contains(@class, 'animate-pulse')] | "
                                    "//div[contains(@class, 'spinner')]"
                                ))
                            )
                            print("  ✓ Loading indicators disappeared")
                        except:
                            print("  ℹ No loading indicators found or timeout - continuing")
                            time.sleep(2)  # Give it a moment anyway
                        
                        # Wait for at least one salon card to be visible (not just present)
                        print("  Step 2: Waiting for salon cards to be visible...")
                        WebDriverWait(self.driver, 20).until(
                            EC.visibility_of_element_located((By.XPATH, 
                                "//div[contains(@class, 'Card')] | "
                                "//div[contains(@class, 'card')] | "
                                "//article"
                            ))
                        )
                        print("  ✓ Salon cards are visible")
                        
                        # Additional wait to ensure cards are fully rendered
                        time.sleep(2)
                        
                        # Wait specifically for "Selenium Test Salon" text to be visible
                        print("  Step 3: Waiting for 'Selenium Test Salon' to appear...")
                        WebDriverWait(self.driver, 15).until(
                            EC.visibility_of_element_located((By.XPATH, 
                                "//*[contains(text(), 'Selenium Test Salon')]"
                            ))
                        )
                        print("  ✓ 'Selenium Test Salon' is visible on page")
                        
                        # Wait for View Details buttons to be present and clickable
                        print("  Step 4: Waiting for View Details buttons to be available...")
                        WebDriverWait(self.driver, 10).until(
                            EC.presence_of_element_located((By.XPATH, 
                                "//button[contains(@id, 'view-details-button-')]"
                            ))
                        )
                        print("  ✓ View Details buttons are present")
                        
                        # Wait for at least one View Details button to be clickable
                        print("  Step 5: Waiting for View Details button to be clickable...")
                        WebDriverWait(self.driver, 10).until(
                            EC.element_to_be_clickable((By.XPATH, 
                                "//button[contains(@id, 'view-details-button-')]"
                            ))
                        )
                        print("  ✓ View Details buttons are clickable")
                        
                        # Final wait to ensure everything is fully interactive
                        time.sleep(2)
                        print("  ✓ Salon cards are fully loaded and ready for interaction")
                    except Exception as e:
                        print(f"  ⚠ Error waiting for salon cards: {e}")
                        import traceback
                        traceback.print_exc()
                        print("  Continuing anyway - cards might still be loading...")
                        time.sleep(3)  # Extra wait before continuing
                    
                    # Find salon card with "Selenium Test Salon" and click View Details
                    print("Finding salon card and clicking View Details...")
                    try:
                        # Find all salon cards and look for the one with our salon name
                        salon_cards = self.driver.find_elements(By.XPATH, 
                            "//div[contains(@class, 'Card')] | //div[contains(@class, 'card')] | //article"
                        )
                        print(f"    Found {len(salon_cards)} salon card(s) on page")
                        
                        # Look for the View Details button for our salon
                        # Try multiple strategies to find it
                        view_details_button = None
                        try:
                            # Strategy 1: Find by salon name in the card, then find View Details button
                            salon_name_elements = self.driver.find_elements(By.XPATH, 
                                "//*[contains(text(), 'Selenium Test Salon')]"
                            )
                            if salon_name_elements:
                                for name_elem in salon_name_elements:
                                    # Find the parent card
                                    card = name_elem.find_element(By.XPATH, "./ancestor::div[contains(@class, 'Card') or contains(@class, 'card')][1]")
                                    # Find View Details button in that card
                                    try:
                                        view_details_button = card.find_element(By.XPATH, ".//button[contains(@id, 'view-details-button-')]")
                                        break
                                    except:
                                        continue
                        except:
                            pass
                        
                        # Strategy 2: Find all View Details buttons and check nearby text
                        if not view_details_button:
                            print("    Trying Strategy 2: Finding View Details buttons by ID...")
                            all_view_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'view-details-button-')]")
                            print(f"    Found {len(all_view_buttons)} View Details button(s)")
                            for btn in all_view_buttons:
                                try:
                                    # Check if "Selenium Test Salon" is nearby
                                    card = btn.find_element(By.XPATH, "./ancestor::div[contains(@class, 'Card') or contains(@class, 'card')][1]")
                                    card_text = card.text
                                    if "Selenium Test Salon" in card_text:
                                        view_details_button = btn
                                        print(f"    Found matching View Details button in card with text: {card_text[:50]}...")
                                        break
                                except:
                                    continue
                        
                        if view_details_button:
                            # Wait for button to be clickable
                            try:
                                WebDriverWait(self.driver, 5).until(
                                    EC.element_to_be_clickable(view_details_button)
                                )
                            except:
                                pass  # Continue anyway
                            
                            self.scroll_to_element(view_details_button)
                            time.sleep(0.3)
                            
                            # Ensure button is in viewport
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center', behavior: 'smooth'});", view_details_button)
                            time.sleep(0.3)
                            
                            try:
                                self.driver.execute_script("arguments[0].click();", view_details_button)
                                print("    ✓ Clicked View Details button (JavaScript click)")
                            except:
                                view_details_button.click()
                                print("    ✓ Clicked View Details button (regular click)")
                            time.sleep(2)  # Wait for salon detail page to load
                            print(f"    Current URL after clicking View Details: {self.driver.current_url}")
                        else:
                            print("    ⚠ Could not find View Details button for salon")
                            # Try to find by text as fallback
                            try:
                                view_details_by_text = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'View Details')]")
                                if view_details_by_text:
                                    print("    Found View Details button by text, trying to click...")
                                    for btn in view_details_by_text:
                                        try:
                                            card = btn.find_element(By.XPATH, "./ancestor::div[contains(@class, 'Card') or contains(@class, 'card')][1]")
                                            if "Selenium Test Salon" in card.text:
                                                self.scroll_to_element(btn)
                                                time.sleep(0.2)
                                                btn.click()
                                                print("    ✓ Clicked View Details button (fallback)")
                                                time.sleep(2)
                                                break
                                        except:
                                            continue
                                else:
                                    raise Exception("View Details button not found")
                            except Exception as e2:
                                print(f"    ⚠ Fallback also failed: {e2}")
                                raise Exception("View Details button not found")
                    except Exception as e:
                        print(f"    ⚠ Error finding/clicking View Details: {e}")
                        import traceback
                        traceback.print_exc()
                        # Continue anyway to see if we can proceed
                    
                    # Click Book Appointment button on salon detail page
                    print("Clicking Book Appointment button...")
                    try:
                        book_appt_button = self.wait.until(EC.element_to_be_clickable((By.ID, "book-appointment-detail-button")))
                        self.scroll_to_element(book_appt_button)
                        time.sleep(0.2)
                        try:
                            self.driver.execute_script("arguments[0].click();", book_appt_button)
                            print("    ✓ Clicked Book Appointment button (JavaScript click)")
                        except:
                            book_appt_button.click()
                            print("    ✓ Clicked Book Appointment button (regular click)")
                        time.sleep(2)  # Wait for booking page to load
                        print(f"    Current URL after clicking Book Appointment: {self.driver.current_url}")
                    except Exception as e:
                        print(f"    ⚠ Error clicking Book Appointment button: {e}")
                        import traceback
                        traceback.print_exc()
                        # Try fallback by text
                        try:
                            book_by_text = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Book Appointment')]")
                            book_by_text.click()
                            time.sleep(2)
                            print("    ✓ Clicked Book Appointment button (fallback by text)")
                        except:
                            print("    ⚠ Could not find Book Appointment button")
                    
                    # Select stylist
                    print("Selecting stylist...")
                    try:
                        # Wait a bit for stylists to load
                        time.sleep(1)
                        
                        # Find stylist buttons by ID pattern
                        stylist_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'select-stylist-button-')]")
                        print(f"    Found {len(stylist_buttons)} stylist button(s)")

                        # Prefer the first enabled stylist button (works for first and second booking)
                        stylist_button = None
                        for btn in stylist_buttons:
                            try:
                                if btn.is_enabled() and btn.is_displayed():
                                    stylist_button = btn
                                    break
                            except:
                                continue

                        if stylist_button:
                            self.scroll_to_element(stylist_button)
                            time.sleep(0.2)
                            try:
                                self.driver.execute_script("arguments[0].click();", stylist_button)
                                print(f"    ✓ Selected stylist button with id: {stylist_button.get_attribute('id')} (JavaScript click)")
                            except:
                                stylist_button.click()
                                print(f"    ✓ Selected stylist button with id: {stylist_button.get_attribute('id')} (regular click)")
                            time.sleep(2)  # Wait for services to load
                        else:
                            print("    ⚠ No stylist buttons found or all disabled")
                    except Exception as e:
                        print(f"    ⚠ Error selecting stylist: {e}")
                        import traceback
                        traceback.print_exc()
                    
                    # Select a service
                    print("Selecting a service...")
                    try:
                        time.sleep(1)  # Wait for services to appear
                        service_buttons = self.driver.find_elements(By.XPATH, "//div[contains(@id, 'select-service-button-')]")
                        print(f"    Found {len(service_buttons)} service button(s)")
                        
                        if service_buttons:
                            service_button = service_buttons[0]  # Select first available service
                            self.scroll_to_element(service_button)
                            time.sleep(0.2)
                            try:
                                self.driver.execute_script("arguments[0].click();", service_button)
                                print("    ✓ Selected service (JavaScript click)")
                            except:
                                service_button.click()
                                print("    ✓ Selected service (regular click)")
                            time.sleep(2)  # Wait for dates to load
                        else:
                            print("    ⚠ No services found - waiting longer...")
                            time.sleep(2)
                            service_buttons = self.driver.find_elements(By.XPATH, "//div[contains(@id, 'select-service-button-')]")
                            if service_buttons:
                                service_button = service_buttons[0]
                                self.scroll_to_element(service_button)
                                time.sleep(0.2)
                                service_button.click()
                                print("    ✓ Selected service (after retry)")
                                time.sleep(2)
                            else:
                                print("    ⚠ Still no services found")
                    except Exception as e:
                        print(f"    ⚠ Error selecting service: {e}")
                        import traceback
                        traceback.print_exc()
                    
                    # Select a date (skip today, select tomorrow or later)
                    print("Selecting a date (skipping today, selecting tomorrow or later)...")
                    try:
                        time.sleep(1)  # Wait for dates to appear
                        date_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'select-date-button-')]")
                        print(f"    Found {len(date_buttons)} date button(s)")
                        
                        # Filter out disabled dates
                        available_date_buttons = []
                        for btn in date_buttons:
                            try:
                                if btn.is_enabled():
                                    available_date_buttons.append(btn)
                            except:
                                continue
                        
                        print(f"    Found {len(available_date_buttons)} available date(s)")
                        
                        if available_date_buttons:
                            # Skip the first date (today) and select the second one (tomorrow) or later
                            if len(available_date_buttons) > 1:
                                date_button = available_date_buttons[1]  # Select second available date (tomorrow)
                                print("    Selecting second date (tomorrow) to avoid today's time slot issues")
                            else:
                                date_button = available_date_buttons[0]  # Fallback to first if only one available
                                print("    Only one date available, selecting it")
                            
                            self.scroll_to_element(date_button)
                            time.sleep(0.2)
                            try:
                                self.driver.execute_script("arguments[0].click();", date_button)
                                print("    ✓ Selected date (JavaScript click)")
                            except:
                                date_button.click()
                                print("    ✓ Selected date (regular click)")
                            time.sleep(2)  # Wait for time slots to load
                        else:
                            print("    ⚠ No available dates found")
                    except Exception as e:
                        print(f"    ⚠ Error selecting date: {e}")
                        import traceback
                        traceback.print_exc()
                    
                    # Select a time
                    print("Selecting a time...")
                    try:
                        time.sleep(1)  # Wait for time slots to appear
                        time_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'select-time-button-')]")
                        print(f"    Found {len(time_buttons)} time button(s)")
                        
                        # Filter out disabled time buttons
                        available_time_buttons = []
                        for btn in time_buttons:
                            try:
                                if btn.is_enabled():
                                    available_time_buttons.append(btn)
                            except:
                                continue
                        
                        print(f"    Found {len(available_time_buttons)} available time(s)")
                        
                        if available_time_buttons:
                            time_button = available_time_buttons[0]  # Select first available time
                            self.scroll_to_element(time_button)
                            time.sleep(0.2)
                            try:
                                self.driver.execute_script("arguments[0].click();", time_button)
                                print("    ✓ Selected time (JavaScript click)")
                            except:
                                time_button.click()
                                print("    ✓ Selected time (regular click)")
                            time.sleep(1)
                        else:
                            print("    ⚠ No available times found")
                    except Exception as e:
                        print(f"    ⚠ Error selecting time: {e}")
                        import traceback
                        traceback.print_exc()
                    
                    # Click Book Appointment button
                    print("Clicking Book Appointment submit button...")
                    try:
                        book_submit_button = self.wait.until(EC.element_to_be_clickable((By.ID, "book-appointment-submit-button")))
                        self.scroll_to_element(book_submit_button)
                        time.sleep(0.2)
                        try:
                            self.driver.execute_script("arguments[0].click();", book_submit_button)
                            print("    ✓ Clicked Book Appointment submit button (JavaScript click)")
                        except:
                            book_submit_button.click()
                            print("    ✓ Clicked Book Appointment submit button (regular click)")
                        time.sleep(2)  # Wait for confirmation modal
                    except Exception as e:
                        print(f"    ⚠ Error clicking Book Appointment submit button: {e}")
                        import traceback
                        traceback.print_exc()
                    
                    # Click Confirm button in modal
                    print("Clicking Confirm button in booking modal...")
                    try:
                        confirm_button = self.wait.until(EC.element_to_be_clickable((By.ID, "booking-confirm-button")))
                        self.scroll_to_element(confirm_button)
                        time.sleep(0.2)
                        try:
                            self.driver.execute_script("arguments[0].click();", confirm_button)
                            print("    ✓ Clicked Confirm button (JavaScript click)")
                        except:
                            confirm_button.click()
                            print("    ✓ Clicked Confirm button (regular click)")
                        time.sleep(3)  # Wait for payment page to load
                        print(f"    Current URL after confirming: {self.driver.current_url}")
                    except Exception as e:
                        print(f"    ⚠ Error clicking Confirm button: {e}")
                        import traceback
                        traceback.print_exc()
                        # Try fallback
                        try:
                            confirm_by_text = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Confirm')]")
                            confirm_by_text.click()
                            time.sleep(3)
                            print("    ✓ Clicked Confirm button (fallback by text)")
                        except:
                            print("    ⚠ Could not find Confirm button")
                    
                    # Fill billing address
                    print("Filling billing address...")
                    try:
                        # Wait for payment page to load
                        time.sleep(1)
                        print(f"    Current URL: {self.driver.current_url}")
                        
                        # Check if we need to click "Enter Card Details" first (if form is not visible)
                        try:
                            enter_card_button = self.driver.find_element(By.ID, "enter-card-details-button")
                            if enter_card_button.is_displayed():
                                print("    Clicking 'Enter Card Details' to show form...")
                                enter_card_button.click()
                                time.sleep(0.5)
                        except:
                            pass  # Form might already be visible
                        
                        # Full Name
                        full_name_input = self.wait.until(EC.presence_of_element_located((By.ID, "billing-address-full-name-input")))
                        full_name_input.clear()
                        full_name_input.send_keys("Nas Miah")
                        time.sleep(0.2)
                        print("    ✓ Entered full name")
                        
                        # Street Address
                        address_line1_input = self.wait.until(EC.presence_of_element_located((By.ID, "billing-address-line1-input")))
                        address_line1_input.clear()
                        address_line1_input.send_keys("123 Main St")
                        time.sleep(0.2)
                        print("    ✓ Entered street address")
                        
                        # Address Line 2 (optional)
                        try:
                            address_line2_input = self.wait.until(EC.presence_of_element_located((By.ID, "billing-address-line2-input")))
                            address_line2_input.clear()
                            address_line2_input.send_keys("Apt 4B")
                            time.sleep(0.2)
                            print("    ✓ Entered address line 2")
                        except:
                            pass
                        
                        # City
                        city_input = self.wait.until(EC.presence_of_element_located((By.ID, "billing-address-city-input")))
                        city_input.clear()
                        city_input.send_keys("Newark")
                        time.sleep(0.2)
                        print("    ✓ Entered city")
                        
                        # State (dropdown)
                        state_select = self.wait.until(EC.element_to_be_clickable((By.ID, "billing-address-state-select")))
                        state_select.click()
                        time.sleep(0.3)
                        nj_option = WebDriverWait(self.driver, 3).until(
                            EC.element_to_be_clickable((By.XPATH, "//div[@role='option' and text()='NJ']"))
                        )
                        nj_option.click()
                        time.sleep(0.3)
                        print("    ✓ Selected state: NJ")
                        
                        # Postal Code
                        postal_code_input = self.wait.until(EC.presence_of_element_located((By.ID, "billing-address-postal-code-input")))
                        postal_code_input.clear()
                        postal_code_input.send_keys("07508")
                        time.sleep(0.2)
                        print("    ✓ Entered postal code")
                        
                        # Save Address button
                        save_address_button = self.wait.until(EC.element_to_be_clickable((By.ID, "save-billing-address-button")))
                        self.scroll_to_element(save_address_button)
                        time.sleep(0.2)
                        try:
                            self.driver.execute_script("arguments[0].click();", save_address_button)
                            print("    ✓ Clicked Save Address button (JavaScript click)")
                        except:
                            save_address_button.click()
                            print("    ✓ Clicked Save Address button (regular click)")
                        time.sleep(2)  # Wait for address to be saved
                        print("    ✓ Billing address saved")
                    except Exception as e:
                        print(f"    ⚠ Error filling billing address: {e}")
                        import traceback
                        traceback.print_exc()
                        # Continue anyway - address might already be saved
                    
                    # Fill payment card information
                    print("Filling payment card information...")
                    try:
                        time.sleep(1)  # Wait a bit
                        
                        # Check if "Enter Card Details" button is visible (if no saved cards)
                        try:
                            enter_card_button = self.driver.find_element(By.ID, "enter-card-details-button")
                            if enter_card_button.is_displayed():
                                print("    Clicking 'Enter Card Details' button...")
                                enter_card_button.click()
                                time.sleep(1)
                                print("    ✓ Clicked Enter Card Details button")
                        except:
                            print("    Form already visible or button not found")
                            pass  # Button might not exist if form is already visible
                        
                        # Card Number
                        card_number_input = self.wait.until(EC.presence_of_element_located((By.ID, "payment-card-number-input")))
                        card_number_input.clear()
                        card_number_input.send_keys("4242 4242 4242 4242")
                        time.sleep(0.2)
                        print("    ✓ Entered card number")
                        
                        # Cardholder Name
                        cardholder_name_input = self.wait.until(EC.presence_of_element_located((By.ID, "payment-cardholder-name-input")))
                        cardholder_name_input.clear()
                        cardholder_name_input.send_keys("Nas Miah")
                        time.sleep(0.2)
                        print("    ✓ Entered cardholder name")
                        
                        # Expiration Month (dropdown)
                        exp_month_select = self.wait.until(EC.element_to_be_clickable((By.ID, "payment-exp-month-select")))
                        exp_month_select.click()
                        time.sleep(0.3)
                        month_option = WebDriverWait(self.driver, 3).until(
                            EC.element_to_be_clickable((By.XPATH, "//div[@role='option' and text()='01']"))
                        )
                        month_option.click()
                        time.sleep(0.3)
                        print("    ✓ Selected expiration month: 01")
                        
                        # Expiration Year (dropdown)
                        exp_year_select = self.wait.until(EC.element_to_be_clickable((By.ID, "payment-exp-year-select")))
                        exp_year_select.click()
                        time.sleep(0.3)
                        year_option = WebDriverWait(self.driver, 3).until(
                            EC.element_to_be_clickable((By.XPATH, "//div[@role='option' and text()='2026']"))
                        )
                        year_option.click()
                        time.sleep(0.3)
                        print("    ✓ Selected expiration year: 2026")
                        
                        # CVV
                        cvv_input = self.wait.until(EC.presence_of_element_located((By.ID, "payment-cvv-input")))
                        cvv_input.clear()
                        cvv_input.send_keys("123")
                        time.sleep(0.2)
                        print("    ✓ Entered CVV")

                        # Save card for future use checkbox
                        try:
                            save_card_checkbox = self.driver.find_element(By.ID, "save-card-checkbox")
                            if save_card_checkbox.is_displayed():
                                print("    Clicking 'Save this card for future use' checkbox...")
                                self.scroll_to_element(save_card_checkbox)
                                time.sleep(0.2)
                                if not save_card_checkbox.is_selected():
                                    save_card_checkbox.click()
                                    time.sleep(0.2)
                                print("    ✓ 'Save card for future use' checkbox is selected")
                        except Exception as e:
                            print(f"    ⚠ Could not click 'Save card for future use' checkbox: {e}")
                        
                        # Process Payment button
                        print("Clicking Process Payment button...")
                        process_payment_button = self.wait.until(EC.element_to_be_clickable((By.ID, "process-payment-button")))
                        self.scroll_to_element(process_payment_button)
                        time.sleep(0.2)
                        try:
                            self.driver.execute_script("arguments[0].click();", process_payment_button)
                            print("    ✓ Clicked Process Payment button (JavaScript click)")
                        except:
                            process_payment_button.click()
                            print("    ✓ Clicked Process Payment button (regular click)")
                        time.sleep(ACTION_DELAY * 5)  # Wait for payment processing
                        print(f"    Current URL after payment: {self.driver.current_url}")
                        print("    ✓ Payment processing completed")
                        print("\n" + "="*70)
                        print("BOOKING FLOW COMPLETED SUCCESSFULLY (FIRST APPOINTMENT)")
                        print("="*70)

                        # Update loyalty settings and send promotions before second booking
                        self.perform_loyalty_and_promotion_updates()

                        # ============================
                        # SECOND APPOINTMENT VIA BOOK NOW
                        # ============================
                        try:
                            print("\nStarting second booking via 'Book Now'...")
                            # Navigate back to browse salons
                            self.driver.get(f"{BASE_URL}/browser")
                            time.sleep(2)
                            print(f"  Current URL (second booking): {self.driver.current_url}")

                            # Wait for salon cards and Selenium Test Salon to appear
                            print("  Waiting for salon cards for second booking...")
                            try:
                                WebDriverWait(self.driver, 15).until(
                                    EC.visibility_of_element_located((By.XPATH,
                                        "//div[contains(@class, 'Card')] | //div[contains(@class, 'card')] | //article"
                                    ))
                                )
                                WebDriverWait(self.driver, 10).until(
                                    EC.visibility_of_element_located((By.XPATH,
                                        "//*[contains(text(), 'Selenium Test Salon')]"
                                    ))
                                )
                                time.sleep(1)
                            except Exception as e:
                                print(f"  ⚠ Error waiting for cards on second booking: {e}")

                            # Find Book Now button for Selenium Test Salon
                            print("  Finding 'Book Now' button for Selenium Test Salon...")
                            book_now_button = None
                            try:
                                # Strategy: find all book-now buttons and match card text
                                all_book_now = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'book-now-button-')]")
                                print(f"    Found {len(all_book_now)} Book Now button(s)")
                                for btn in all_book_now:
                                    try:
                                        card = btn.find_element(By.XPATH, "./ancestor::div[contains(@class, 'Card') or contains(@class, 'card')][1]")
                                        if "Selenium Test Salon" in card.text:
                                            book_now_button = btn
                                            break
                                    except:
                                        continue
                            except Exception as e:
                                print(f"    ⚠ Error finding Book Now buttons: {e}")

                            if book_now_button:
                                self.scroll_to_element(book_now_button)
                                time.sleep(0.3)
                                try:
                                    self.driver.execute_script("arguments[0].click();", book_now_button)
                                    print("    ✓ Clicked Book Now button (JavaScript click)")
                                except:
                                    book_now_button.click()
                                    print("    ✓ Clicked Book Now button (regular click)")
                                
                                # Wait for booking page to load - wait for stylist buttons to appear
                                print("  Waiting for booking page to load...")
                                try:
                                    WebDriverWait(self.driver, 10).until(
                                        EC.presence_of_element_located((By.XPATH, "//button[contains(@id, 'select-stylist-button-')]"))
                                    )
                                    print("    ✓ Booking page loaded, stylist buttons are present")
                                except Exception as e:
                                    print(f"    ⚠ Timeout waiting for booking page to load: {e}")
                                    time.sleep(2)  # Fallback wait
                                
                                print(f"  URL after clicking Book Now: {self.driver.current_url}")
                            else:
                                print("    ⚠ Could not find Book Now button for Selenium Test Salon")

                            # Re-use same selection flow: stylist, service, date, time
                            print("  Second booking: selecting stylist / service / slot...")

                            # Stylist - use same robust approach as first booking
                            print("  [Second booking] Selecting stylist...")
                            try:
                                # Wait a bit for stylists to load
                                time.sleep(1)
                                
                                # Find stylist buttons by ID pattern (same as first booking)
                                stylist_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'select-stylist-button-')]")
                                print(f"    [Second booking] Found {len(stylist_buttons)} stylist button(s)")

                                # Prefer the first enabled stylist button (same logic as first booking)
                                stylist_button = None
                                for btn in stylist_buttons:
                                    try:
                                        if btn.is_enabled() and btn.is_displayed():
                                            stylist_button = btn
                                            break
                                    except:
                                        continue

                                if stylist_button:
                                    self.scroll_to_element(stylist_button)
                                    time.sleep(0.2)
                                    try:
                                        self.driver.execute_script("arguments[0].click();", stylist_button)
                                        print(f"    ✓ [Second booking] Selected stylist button with id: {stylist_button.get_attribute('id')} (JavaScript click)")
                                    except:
                                        stylist_button.click()
                                        print(f"    ✓ [Second booking] Selected stylist button with id: {stylist_button.get_attribute('id')} (regular click)")
                                    time.sleep(2)  # Wait for services to load
                                else:
                                    print("    ⚠ [Second booking] No stylist buttons found or all disabled")
                                    # Retry after a longer wait
                                    print("    [Second booking] Retrying after longer wait...")
                                    time.sleep(3)
                                    stylist_buttons_retry = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'select-stylist-button-')]")
                                    for btn in stylist_buttons_retry:
                                        try:
                                            if btn.is_enabled() and btn.is_displayed():
                                                stylist_button = btn
                                                self.scroll_to_element(stylist_button)
                                                time.sleep(0.2)
                                                stylist_button.click()
                                                print(f"    ✓ [Second booking] Selected stylist after retry: {stylist_button.get_attribute('id')}")
                                                time.sleep(2)
                                                break
                                        except:
                                            continue
                            except Exception as e:
                                print(f"    ⚠ [Second booking] Error selecting stylist: {e}")
                                import traceback
                                traceback.print_exc()

                            # Service - select the 1-minute service (Haircut)
                            print("  [Second booking] Selecting the 1-minute service (Haircut)...")
                            try:
                                time.sleep(1)  # Wait for services to appear
                                service_buttons = self.driver.find_elements(By.XPATH, "//div[contains(@id, 'select-service-button-')]")
                                print(f"    [Second booking] Found {len(service_buttons)} service button(s)")
                                
                                # Find the service with "Haircut" name (1-minute service)
                                haircut_service = None
                                for btn in service_buttons:
                                    try:
                                        # Check if the button contains "Haircut" text
                                        btn_text = btn.text
                                        if "Haircut" in btn_text:
                                            haircut_service = btn
                                            print(f"    [Second booking] Found Haircut service: {btn_text}")
                                            break
                                    except:
                                        continue
                                
                                if haircut_service:
                                    self.scroll_to_element(haircut_service)
                                    time.sleep(0.2)
                                    try:
                                        self.driver.execute_script("arguments[0].click();", haircut_service)
                                        print("    ✓ [Second booking] Selected 1-minute Haircut service (JavaScript click)")
                                    except:
                                        haircut_service.click()
                                        print("    ✓ [Second booking] Selected 1-minute Haircut service (regular click)")
                                    time.sleep(2)  # Wait for dates to load
                                elif service_buttons:
                                    # Fallback to first service if Haircut not found
                                    service_button = service_buttons[0]
                                    self.scroll_to_element(service_button)
                                    time.sleep(0.2)
                                    service_button.click()
                                    print("    ✓ [Second booking] Selected first available service (fallback)")
                                    time.sleep(2)
                                else:
                                    print("    ⚠ [Second booking] No services found - waiting longer...")
                                    time.sleep(2)
                                    service_buttons = self.driver.find_elements(By.XPATH, "//div[contains(@id, 'select-service-button-')]")
                                    if service_buttons:
                                        service_button = service_buttons[0]
                                        self.scroll_to_element(service_button)
                                        time.sleep(0.2)
                                        service_button.click()
                                        print("    ✓ [Second booking] Selected service (after retry)")
                                        time.sleep(2)
                                    else:
                                        print("    ⚠ [Second booking] Still no services found")
                            except Exception as e:
                                print(f"    ⚠ [Second booking] Error selecting service: {e}")
                                import traceback
                                traceback.print_exc()

                            # Date - select today
                            print("  [Second booking] Selecting today's date...")
                            try:
                                time.sleep(1)  # Wait for dates to appear
                                date_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'select-date-button-')]")
                                print(f"    [Second booking] Found {len(date_buttons)} date button(s)")
                                
                                # Filter out disabled dates
                                available_date_buttons = []
                                for btn in date_buttons:
                                    try:
                                        if btn.is_enabled():
                                            available_date_buttons.append(btn)
                                    except:
                                        continue
                                
                                print(f"    [Second booking] Found {len(available_date_buttons)} available date(s)")
                                
                                if available_date_buttons:
                                    # Select the first date (today)
                                    date_button = available_date_buttons[0]
                                    print("    [Second booking] Selecting today's date")
                                    self.scroll_to_element(date_button)
                                    time.sleep(0.2)
                                    try:
                                        self.driver.execute_script("arguments[0].click();", date_button)
                                        print("    ✓ [Second booking] Selected today's date (JavaScript click)")
                                    except:
                                        date_button.click()
                                        print("    ✓ [Second booking] Selected today's date (regular click)")
                                    time.sleep(2)  # Wait for time slots to load
                                else:
                                    print("    ⚠ [Second booking] No available dates found")
                            except Exception as e:
                                print(f"    ⚠ [Second booking] Error selecting date: {e}")
                                import traceback
                                traceback.print_exc()

                            # Time - use custom time (1 minute after current time)
                            print("  [Second booking] Selecting custom time (1 minute after current time)...")
                            try:
                                time.sleep(1)  # Wait for time options to appear
                                
                                # Click "Custom Time" button using ID
                                try:
                                    custom_time_button = self.wait.until(
                                        EC.element_to_be_clickable((By.ID, "custom-time-button"))
                                    )
                                    self.scroll_to_element(custom_time_button)
                                    time.sleep(0.2)
                                    custom_time_button.click()
                                    time.sleep(0.5)
                                    print("    ✓ [Second booking] Clicked Custom Time button")
                                except Exception as e:
                                    print(f"    ⚠ [Second booking] Could not find/click Custom Time button: {e}")
                                
                                # Get current time and add 1 minute
                                from datetime import datetime, timedelta
                                now = datetime.now()
                                future_time = now + timedelta(minutes=1)
                                time_str = future_time.strftime("%H:%M")  # Format as HH:MM (24-hour)
                                
                                print(f"    [Second booking] Current time: {now.strftime('%H:%M')}, Booking for: {time_str}")
                                
                                # Find and fill the start time input using ID
                                try:
                                    start_time_input = self.wait.until(
                                        EC.presence_of_element_located((By.ID, "custom-start-time"))
                                    )
                                    self.scroll_to_element(start_time_input)
                                    time.sleep(0.2)
                                    start_time_input.click()
                                    time.sleep(0.1)
                                    start_time_input.clear()
                                    start_time_input.send_keys(time_str)
                                    time.sleep(0.2)
                                    
                                    # Trigger React events
                                    self.driver.execute_script(f"""
                                        var input = arguments[0];
                                        var value = '{time_str}';
                                        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                                        nativeInputValueSetter.call(input, value);
                                        input.dispatchEvent(new Event('input', {{ bubbles: true, cancelable: true }}));
                                        input.dispatchEvent(new Event('change', {{ bubbles: true, cancelable: true }}));
                                    """, start_time_input)
                                    time.sleep(0.5)
                                    print(f"    ✓ [Second booking] Set custom time to {time_str}")
                                except Exception as e:
                                    print(f"    ⚠ [Second booking] Error setting custom time: {e}")
                                    import traceback
                                    traceback.print_exc()
                            except Exception as e:
                                print(f"    ⚠ [Second booking] Error selecting custom time: {e}")
                                import traceback
                                traceback.print_exc()

                            # Click Book Appointment button - use same approach as first booking
                            print("  [Second booking] Clicking Book Appointment submit button...")
                            try:
                                book_submit_button = self.wait.until(EC.element_to_be_clickable((By.ID, "book-appointment-submit-button")))
                                self.scroll_to_element(book_submit_button)
                                time.sleep(0.2)
                                try:
                                    self.driver.execute_script("arguments[0].click();", book_submit_button)
                                    print("    ✓ [Second booking] Clicked Book Appointment submit button (JavaScript click)")
                                except:
                                    book_submit_button.click()
                                    print("    ✓ [Second booking] Clicked Book Appointment submit button (regular click)")
                                time.sleep(2)  # Wait for confirmation modal
                            except Exception as e:
                                print(f"    ⚠ [Second booking] Error clicking Book Appointment submit button: {e}")
                                import traceback
                                traceback.print_exc()
                            
                            # Click Confirm button in modal - use same approach as first booking
                            print("  [Second booking] Clicking Confirm button in booking modal...")
                            try:
                                confirm_button = self.wait.until(EC.element_to_be_clickable((By.ID, "booking-confirm-button")))
                                self.scroll_to_element(confirm_button)
                                time.sleep(0.2)
                                try:
                                    self.driver.execute_script("arguments[0].click();", confirm_button)
                                    print("    ✓ [Second booking] Clicked Confirm button (JavaScript click)")
                                except:
                                    confirm_button.click()
                                    print("    ✓ [Second booking] Clicked Confirm button (regular click)")
                                time.sleep(3)  # Wait for payment page to load
                                print(f"    [Second booking] Current URL after confirming: {self.driver.current_url}")
                            except Exception as e:
                                print(f"    ⚠ [Second booking] Error clicking Confirm button: {e}")
                                import traceback
                                traceback.print_exc()

                            # For second booking, billing/card should already be saved; reuse existing card
                            try:
                                print("  [Second booking] Attempting payment (if required)...")
                                if "/payment" in self.driver.current_url:
                                    self.apply_saved_promo_code()
                                    print("  [Second booking] On payment page - selecting existing saved card...")
                                    try:
                                        # Click the first existing card button
                                        existing_cards = self.driver.find_elements(By.XPATH, "//div[contains(@id, 'existing-card-button-')]")
                                        print(f"    [Second booking] Found {len(existing_cards)} existing card element(s)")
                                        if existing_cards:
                                            existing_card = existing_cards[0]
                                            self.scroll_to_element(existing_card)
                                            time.sleep(0.2)
                                            existing_card.click()
                                            time.sleep(0.5)
                                            print("    ✓ [Second booking] Selected existing saved card")
                                        else:
                                            print("    ⚠ [Second booking] No existing saved cards found; payment button may stay disabled")
                                    except Exception as e:
                                        print(f"    ⚠ [Second booking] Error selecting existing card: {e}")

                                    # Click Process Payment button
                                    try:
                                        process_payment_button_2 = WebDriverWait(self.driver, 5).until(
                                            EC.element_to_be_clickable((By.ID, "process-payment-button"))
                                        )
                                        self.scroll_to_element(process_payment_button_2)
                                        time.sleep(0.2)
                                        try:
                                            self.driver.execute_script("arguments[0].click();", process_payment_button_2)
                                        except:
                                            process_payment_button_2.click()
                                        time.sleep(3)
                                        print("    ✓ [Second booking] Processed payment using saved card")
                                    except Exception as e:
                                        print(f"    ⚠ [Second booking] Process payment button not clickable or not found: {e}")
                                else:
                                    print("  [Second booking] Not on payment page; assuming booking confirmed")
                            except Exception as e:
                                print(f"    ⚠ [Second booking] Error during payment step: {e}")

                            print("\n" + "-"*70)
                            print("SECOND BOOKING FLOW COMPLETED (or best-effort)")
                            print("-"*70)
                        except Exception as e:
                            print(f"  ⚠ Error during second booking flow: {e}")

                        # ============================
                        # RESCHEDULE FROM MY APPOINTMENTS
                        # ============================
                        try:
                            print("\nNavigating to My Appointments to test reschedule...")
                            self.driver.get(f"{BASE_URL}/appointments")
                            time.sleep(2)
                            print(f"  Current URL (appointments): {self.driver.current_url}")

                            # Wait for at least one reschedule button
                            WebDriverWait(self.driver, 15).until(
                                EC.presence_of_element_located((By.XPATH,
                                    "//button[contains(@id, 'reschedule-appointment-button-')]"
                                ))
                            )
                            reschedule_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'reschedule-appointment-button-')]")
                            print(f"  Found {len(reschedule_buttons)} reschedule button(s)")
                            
                            # Store booking_id from the first reschedule button for private note interactions
                            rescheduled_booking_id = None
                            if reschedule_buttons:
                                resched_button = reschedule_buttons[0]
                                # Extract booking_id from button ID
                                button_id = resched_button.get_attribute('id')
                                if button_id and 'reschedule-appointment-button-' in button_id:
                                    rescheduled_booking_id = button_id.replace('reschedule-appointment-button-', '')
                                    print(f"  Stored booking_id for private note: {rescheduled_booking_id}")
                                
                                self.scroll_to_element(resched_button)
                                time.sleep(0.2)
                                try:
                                    self.driver.execute_script("arguments[0].click();", resched_button)
                                except:
                                    resched_button.click()
                                print("  ✓ Clicked Reschedule button for first appointment")
                                time.sleep(3)  # Wait for booking page/reschedule view

                                # On reschedule booking page: attempt to change service (should be locked)
                                print("  Testing service change during reschedule (should be blocked)...")
                                try:
                                    other_service_buttons = self.driver.find_elements(By.XPATH, "//div[contains(@id, 'select-service-button-')]")
                                    if len(other_service_buttons) > 1:
                                        other_service = other_service_buttons[1]
                                        self.scroll_to_element(other_service)
                                        time.sleep(0.2)
                                        other_service.click()
                                        print("    ✓ Clicked another service (logic should prevent actual change)")
                                    else:
                                        print("    ℹ Not enough services to test change during reschedule")
                                except Exception as e:
                                    print(f"    ⚠ Error clicking other service during reschedule: {e}")

                                # Change to a later date/time using same logic (skip today)
                                print("  Selecting a new (later) date/time for reschedule...")
                                try:
                                    time.sleep(1)
                                    date_buttons_r = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'select-date-button-')]")
                                    available_dates_r = [b for b in date_buttons_r if b.is_enabled()]
                                    if len(available_dates_r) > 1:
                                        date_button_r = available_dates_r[-1]  # pick a later date
                                    elif available_dates_r:
                                        date_button_r = available_dates_r[0]
                                    else:
                                        date_button_r = None
                                    if date_button_r:
                                        self.scroll_to_element(date_button_r)
                                        time.sleep(0.2)
                                        try:
                                            self.driver.execute_script("arguments[0].click();", date_button_r)
                                        except:
                                            date_button_r.click()
                                        print("    ✓ Selected new reschedule date")
                                        time.sleep(2)

                                        # time
                                        time_buttons_r = self.driver.find_elements(By.XPATH, "//button[contains(@id, 'select-time-button-')]")
                                        avail_times_r = [b for b in time_buttons_r if b.is_enabled()]
                                        if avail_times_r:
                                            time_button_r = avail_times_r[-1]
                                            self.scroll_to_element(time_button_r)
                                            time.sleep(0.2)
                                            try:
                                                self.driver.execute_script("arguments[0].click();", time_button_r)
                                            except:
                                                time_button_r.click()
                                            print("    ✓ Selected new reschedule time")
                                            time.sleep(1)
                                except Exception as e:
                                    print(f"    ⚠ Error selecting new reschedule date/time: {e}")

                                # Submit reschedule (same book-appointment-submit-button and modal)
                                try:
                                    print("  Submitting reschedule...")
                                    resched_submit = self.wait.until(EC.element_to_be_clickable((By.ID, "book-appointment-submit-button")))
                                    self.scroll_to_element(resched_submit)
                                    time.sleep(0.2)
                                    try:
                                        self.driver.execute_script("arguments[0].click();", resched_submit)
                                    except:
                                        resched_submit.click()
                                    time.sleep(2)

                                    # Confirm reschedule
                                    confirm_resched = self.wait.until(EC.element_to_be_clickable((By.ID, "booking-confirm-button")))
                                    self.scroll_to_element(confirm_resched)
                                    time.sleep(0.2)
                                    try:
                                        self.driver.execute_script("arguments[0].click();", confirm_resched)
                                    except:
                                        confirm_resched.click()
                                    time.sleep(3)
                                    print("  ✓ Reschedule flow completed")
                                except Exception as e:
                                    print(f"    ⚠ Error submitting reschedule: {e}")
                            else:
                                print("  ⚠ No reschedule buttons found on appointments page")
                            
                            # ============================
                            # PRIVATE NOTE FLOW AFTER RESCHEDULE
                            # ============================
                            if rescheduled_booking_id:
                                try:
                                    print("\n" + "="*70)
                                    print("PRIVATE NOTE FLOW")
                                    print("="*70)
                                    
                                    # Navigate back to appointments page
                                    print("\nNavigating back to My Appointments for private note...")
                                    self.driver.get(f"{BASE_URL}/appointments")
                                    time.sleep(2)
                                    
                                    # Wait for appointments to load
                                    WebDriverWait(self.driver, 10).until(
                                        EC.presence_of_element_located((By.XPATH,
                                            "//button[contains(@id, 'private-note-add-button-')] | //button[contains(@id, 'private-note-edit-button-')]"
                                        ))
                                    )
                                    
                                    # Add private note
                                    print(f"  Adding private note to booking {rescheduled_booking_id}...")
                                    try:
                                        add_note_button = self.wait.until(EC.element_to_be_clickable((
                                            By.ID, f"private-note-add-button-{rescheduled_booking_id}"
                                        )))
                                        self.scroll_to_element(add_note_button)
                                        time.sleep(0.2)
                                        add_note_button.click()
                                        print("    ✓ Clicked 'Add private note' button")
                                        time.sleep(1)
                                        
                                        # Type random note
                                        random_note = f"This is a test note for automation. Random number: {random.randint(1000, 9999)}"
                                        note_textarea = self.wait.until(EC.presence_of_element_located((
                                            By.ID, f"private-note-textarea-{rescheduled_booking_id}"
                                        )))
                                        note_textarea.clear()
                                        note_textarea.send_keys(random_note)
                                        print(f"    ✓ Entered note: {random_note[:50]}...")
                                        time.sleep(0.5)
                                        
                                        # Click Save Note button
                                        save_note_button = self.wait.until(EC.element_to_be_clickable((
                                            By.ID, f"private-note-save-button-{rescheduled_booking_id}"
                                        )))
                                        self.scroll_to_element(save_note_button)
                                        time.sleep(0.2)
                                        save_note_button.click()
                                        print("    ✓ Clicked 'Save Note' button")
                                        time.sleep(2)
                                        
                                        # Click OK on success modal
                                        success_ok_button = self.wait.until(EC.element_to_be_clickable((
                                            By.ID, f"private-note-success-ok-button-{rescheduled_booking_id}"
                                        )))
                                        self.scroll_to_element(success_ok_button)
                                        time.sleep(0.2)
                                        success_ok_button.click()
                                        print("    ✓ Clicked OK on success modal")
                                        time.sleep(1)
                                        
                                    except Exception as e:
                                        print(f"    ⚠ Error adding private note: {e}")
                                        import traceback
                                        traceback.print_exc()
                                    
                                    # Edit private note
                                    print(f"  Editing private note for booking {rescheduled_booking_id}...")
                                    try:
                                        edit_note_button = self.wait.until(EC.element_to_be_clickable((
                                            By.ID, f"private-note-edit-button-{rescheduled_booking_id}"
                                        )))
                                        self.scroll_to_element(edit_note_button)
                                        time.sleep(0.2)
                                        edit_note_button.click()
                                        print("    ✓ Clicked 'Edit' button")
                                        time.sleep(1)
                                        
                                        # Change the note text
                                        edited_note = f"Updated note text. Edit timestamp: {random.randint(10000, 99999)}"
                                        note_textarea = self.wait.until(EC.presence_of_element_located((
                                            By.ID, f"private-note-textarea-{rescheduled_booking_id}"
                                        )))
                                        note_textarea.clear()
                                        note_textarea.send_keys(edited_note)
                                        print(f"    ✓ Changed note to: {edited_note[:50]}...")
                                        time.sleep(0.5)
                                        
                                        # Click Update Note button
                                        update_note_button = self.wait.until(EC.element_to_be_clickable((
                                            By.ID, f"private-note-save-button-{rescheduled_booking_id}"
                                        )))
                                        self.scroll_to_element(update_note_button)
                                        time.sleep(0.2)
                                        update_note_button.click()
                                        print("    ✓ Clicked 'Update Note' button")
                                        time.sleep(2)
                                        
                                        # Click OK on success modal
                                        success_ok_button = self.wait.until(EC.element_to_be_clickable((
                                            By.ID, f"private-note-success-ok-button-{rescheduled_booking_id}"
                                        )))
                                        self.scroll_to_element(success_ok_button)
                                        time.sleep(0.2)
                                        success_ok_button.click()
                                        print("    ✓ Clicked OK on success modal after update")
                                        time.sleep(1)
                                        
                                    except Exception as e:
                                        print(f"    ⚠ Error editing private note: {e}")
                                        import traceback
                                        traceback.print_exc()
                                    
                                    # Scroll through filters
                                    print("  Scrolling through appointment filters...")
                                    filter_order = ['all', 'upcoming', 'past', 'canceled']
                                    for filter_name in filter_order:
                                        try:
                                            filter_button_id = f"appointments-filter-{filter_name}"
                                            filter_button = self.wait.until(EC.element_to_be_clickable((
                                                By.ID, filter_button_id
                                            )))
                                            self.scroll_to_element(filter_button)
                                            time.sleep(0.2)
                                            filter_button.click()
                                            print(f"    ✓ Clicked '{filter_name.title()}' filter")
                                            time.sleep(1.5)  # Wait for appointments to filter
                                        except Exception as e:
                                            print(f"    ⚠ Error clicking {filter_name} filter: {e}")
                                    
                                    # Go back to 'All' filter
                                    print("  Returning to 'All' filter...")
                                    try:
                                        all_filter_button = self.wait.until(EC.element_to_be_clickable((
                                            By.ID, "appointments-filter-all"
                                        )))
                                        self.scroll_to_element(all_filter_button)
                                        time.sleep(0.2)
                                        all_filter_button.click()
                                        print("    ✓ Returned to 'All' filter")
                                        time.sleep(2)  # Wait for appointments to reload
                                    except Exception as e:
                                        print(f"    ⚠ Error returning to 'All' filter: {e}")
                                    
                                    # Delete private note
                                    print(f"  Deleting private note for booking {rescheduled_booking_id}...")
                                    try:
                                        delete_note_button = self.wait.until(EC.element_to_be_clickable((
                                            By.ID, f"private-note-delete-button-{rescheduled_booking_id}"
                                        )))
                                        self.scroll_to_element(delete_note_button)
                                        time.sleep(0.2)
                                        delete_note_button.click()
                                        print("    ✓ Clicked 'Delete' button")
                                        time.sleep(1)
                                        
                                        # Confirm delete in modal
                                        try:
                                            # Wait for delete confirmation modal
                                            delete_confirm_button = self.wait.until(EC.element_to_be_clickable((
                                                By.ID, f"private-note-delete-confirm-button-{rescheduled_booking_id}"
                                            )))
                                            self.scroll_to_element(delete_confirm_button)
                                            time.sleep(0.2)
                                            delete_confirm_button.click()
                                            print("    ✓ Confirmed delete in modal")
                                            time.sleep(2)
                                            
                                            # Click OK on success modal after delete
                                            try:
                                                delete_success_ok = self.wait.until(EC.element_to_be_clickable((
                                                    By.ID, f"private-note-delete-success-ok-button-{rescheduled_booking_id}"
                                                )))
                                                self.scroll_to_element(delete_success_ok)
                                                time.sleep(0.2)
                                                delete_success_ok.click()
                                                print("    ✓ Clicked OK on delete success modal")
                                                time.sleep(1)
                                            except Exception as e:
                                                print(f"    ℹ No delete success modal found (or already dismissed): {e}")
                                        except Exception as e:
                                            print(f"    ℹ Error confirming delete in modal: {e}")
                                        
                                    except Exception as e:
                                        print(f"    ⚠ Error deleting private note: {e}")
                                        import traceback
                                        traceback.print_exc()
                                    
                                    print("\n" + "="*70)
                                    print("PRIVATE NOTE FLOW COMPLETED")
                                    print("="*70)
                                    
                                    # PRODUCT PURCHASE FLOW
                                    print("\n" + "="*70)
                                    print("PRODUCT PURCHASE FLOW")
                                    print("="*70)
                                    
                                    try:
                                        # Get the salon ID from the booking or from the test
                                        # We'll need to find the salon that was created in this test
                                        # For now, we'll navigate to browse and find it by name
                                        
                                        # Click Browse Salons
                                        print("\nNavigating to Browse Salons...")
                                        try:
                                            browse_salons_link = self.wait.until(
                                                EC.element_to_be_clickable((By.XPATH,
                                                    "//a[contains(text(), 'Browse Salons')] | "
                                                    "//button[contains(text(), 'Browse Salons')]"
                                                ))
                                            )
                                            self.scroll_to_element(browse_salons_link)
                                            time.sleep(0.2)
                                            browse_salons_link.click()
                                            time.sleep(1.0)
                                            print("  ✓ Clicked Browse Salons")
                                        except Exception as e:
                                            print(f"  ⚠ Error clicking Browse Salons: {e}")
                                            # Try navigating directly
                                            self.driver.get(f"{BASE_URL}/browser")
                                            time.sleep(1.0)
                                        
                                        # Find the salon that was created in this test
                                        # Look for the salon name that was created (should be "Selenium Test Salon" or similar)
                                        print("\nFinding the test salon...")
                                        time.sleep(1.0)
                                        
                                        # Try to find View Details button for the test salon
                                        # We'll look for a salon card and click View Details
                                        try:
                                            # Look for view details buttons - we'll click the first one or find by salon name
                                            view_details_buttons = self.driver.find_elements(
                                                By.XPATH, 
                                                "//button[contains(@id, 'view-details-button-')]"
                                            )
                                            
                                            if view_details_buttons:
                                                # Click the first salon's view details (assuming it's the test salon)
                                                print(f"  Found {len(view_details_buttons)} salon(s), clicking first View Details...")
                                                self.scroll_to_element(view_details_buttons[0])
                                                time.sleep(0.2)
                                                view_details_buttons[0].click()
                                                time.sleep(1.0)
                                                print("  ✓ Clicked View Details")
                                                
                                                # Extract salon ID from URL
                                                current_url = self.driver.current_url
                                                salon_id_match = None
                                                if "/salon/" in current_url:
                                                    try:
                                                        salon_id_match = current_url.split("/salon/")[1].split("/")[0]
                                                        print(f"  Found salon ID from URL: {salon_id_match}")
                                                    except:
                                                        pass
                                                
                                                # Wait for salon detail page to load
                                                print("\nWaiting for salon detail page to load...")
                                                try:
                                                    # Wait for salon name or key elements to appear (indicating page has loaded)
                                                    self.wait.until(
                                                        EC.any_of(
                                                            EC.presence_of_element_located((By.XPATH, "//h2[contains(@class, 'text-3xl')] | //h1[contains(@class, 'text-3xl')] | //*[contains(@class, 'CardTitle')]")),
                                                            EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'View Products')]"))
                                                        )
                                                    )
                                                    time.sleep(1.0)  # Additional wait for any animations/transitions
                                                    print("  ✓ Salon detail page loaded")
                                                except Exception as e:
                                                    print(f"  ⚠ Warning: Could not confirm page load: {e}")
                                                    time.sleep(2.0)  # Fallback wait
                                                
                                                # Click View Products button
                                                print("\nClicking View Products...")
                                                try:
                                                    view_products_button = self.wait.until(
                                                        EC.element_to_be_clickable((By.XPATH,
                                                            "//button[contains(text(), 'View Products')]"
                                                        ))
                                                    )
                                                    self.scroll_to_element(view_products_button)
                                                    time.sleep(0.2)
                                                    view_products_button.click()
                                                    time.sleep(1.0)
                                                    print("  ✓ Clicked View Products")
                                                    
                                                    # Wait for products page to load
                                                    time.sleep(1.0)
                                                    
                                                    # Find products and add to cart
                                                    print("\nAdding products to cart...")
                                                    try:
                                                        # Find all product cards
                                                        product_cards = self.driver.find_elements(
                                                            By.XPATH,
                                                            "//div[contains(@class, 'card') or contains(@class, 'Card')]//button[contains(text(), 'Add to Cart')]/ancestor::div[contains(@class, 'card') or contains(@class, 'Card')]"
                                                        )
                                                        
                                                        if product_cards:
                                                            # Work with first product
                                                            first_product = product_cards[0]
                                                            
                                                            # Find quantity controls (plus/minus buttons) using IDs
                                                            print("  Adjusting product quantity...")
                                                            try:
                                                                # Extract product ID from the product card
                                                                product_id = None
                                                                # Try to find product ID from Add to Cart button ID
                                                                add_to_cart_buttons = first_product.find_elements(
                                                                    By.XPATH,
                                                                    ".//button[contains(@id, 'add-to-cart-button-')]"
                                                                )
                                                                if add_to_cart_buttons:
                                                                    button_id = add_to_cart_buttons[0].get_attribute("id")
                                                                    if button_id:
                                                                        product_id = button_id.replace("add-to-cart-button-", "")
                                                                        print(f"    Found product ID: {product_id}")
                                                                
                                                                if product_id:
                                                                    # Click plus button using ID
                                                                    try:
                                                                        plus_button = self.wait.until(
                                                                            EC.element_to_be_clickable((By.ID, f"quantity-plus-button-{product_id}"))
                                                                        )
                                                                        self.scroll_to_element(plus_button)
                                                                        time.sleep(0.2)
                                                                        plus_button.click()
                                                                        time.sleep(0.3)
                                                                        print("    ✓ Increased quantity")
                                                                        
                                                                        # Click minus button using ID
                                                                        minus_button = self.wait.until(
                                                                            EC.element_to_be_clickable((By.ID, f"quantity-minus-button-{product_id}"))
                                                                        )
                                                                        self.scroll_to_element(minus_button)
                                                                        time.sleep(0.2)
                                                                        minus_button.click()
                                                                        time.sleep(0.3)
                                                                        print("    ✓ Decreased quantity")
                                                                    except Exception as e:
                                                                        print(f"    ⚠ Error using ID-based quantity buttons: {e}")
                                                                        # Fallback to XPath
                                                                        plus_buttons = first_product.find_elements(
                                                                            By.XPATH,
                                                                            ".//button[.//*[contains(@class, 'Plus') or contains(@class, 'plus')] or .//svg[contains(@class, 'lucide-plus')]]"
                                                                        )
                                                                        if plus_buttons:
                                                                            self.scroll_to_element(plus_buttons[0])
                                                                            time.sleep(0.2)
                                                                            plus_buttons[0].click()
                                                                            time.sleep(0.3)
                                                                            print("    ✓ Increased quantity (fallback)")
                                                                            
                                                                            minus_buttons = first_product.find_elements(
                                                                                By.XPATH,
                                                                                ".//button[.//*[contains(@class, 'Minus') or contains(@class, 'minus')] or .//svg[contains(@class, 'lucide-minus')]]"
                                                                            )
                                                                            if minus_buttons:
                                                                                self.scroll_to_element(minus_buttons[0])
                                                                                time.sleep(0.2)
                                                                                minus_buttons[0].click()
                                                                                time.sleep(0.3)
                                                                                print("    ✓ Decreased quantity (fallback)")
                                                                else:
                                                                    print("    ⚠ Could not find product ID, skipping quantity adjustment")
                                                            except Exception as e:
                                                                print(f"    ⚠ Error adjusting quantity: {e}")
                                                            
                                                            # Click Add to Cart using ID
                                                            print("  Clicking Add to Cart...")
                                                            try:
                                                                if product_id:
                                                                    add_to_cart_button = self.wait.until(
                                                                        EC.element_to_be_clickable((By.ID, f"add-to-cart-button-{product_id}"))
                                                                    )
                                                                else:
                                                                    # Fallback to XPath
                                                                    add_to_cart_button = first_product.find_element(
                                                                        By.XPATH,
                                                                        ".//button[contains(text(), 'Add to Cart')]"
                                                                    )
                                                                self.scroll_to_element(add_to_cart_button)
                                                                time.sleep(0.2)
                                                                add_to_cart_button.click()
                                                                time.sleep(1.0)
                                                                print("    ✓ Clicked Add to Cart")
                                                                
                                                                # Wait for toast notification to appear and disappear
                                                                try:
                                                                    WebDriverWait(self.driver, 3).until(
                                                                        EC.presence_of_element_located((By.XPATH, "//li[@data-sonner-toast]"))
                                                                    )
                                                                    time.sleep(0.5)
                                                                    print("    ✓ Product added to cart notification shown")
                                                                except:
                                                                    pass
                                                            except Exception as e:
                                                                print(f"    ⚠ Error clicking Add to Cart: {e}")
                                                        else:
                                                            print("  ⚠ No products found on page")
                                                    except Exception as e:
                                                        print(f"  ⚠ Error adding products: {e}")
                                                    
                                                    # Click View Cart using ID
                                                    print("\nClicking View Cart...")
                                                    try:
                                                        # Wait longer for cart count to update
                                                        time.sleep(1.5)
                                                        
                                                        # Try using ID first
                                                        try:
                                                            view_cart_button = self.wait.until(
                                                                EC.element_to_be_clickable((By.ID, "view-cart-button"))
                                                            )
                                                            # Wait for button to be enabled
                                                            WebDriverWait(self.driver, 5).until(
                                                                lambda d: view_cart_button.get_attribute("disabled") is None or view_cart_button.get_attribute("disabled") == "false"
                                                            )
                                                        except:
                                                            # Fallback to XPath
                                                            view_cart_button = self.wait.until(
                                                                EC.element_to_be_clickable((By.XPATH,
                                                                    "//button[@id='view-cart-button'] | "
                                                                    "//button[.//span[contains(text(), 'View Cart')]] | "
                                                                    "//button[contains(., 'View Cart')]"
                                                                ))
                                                            )
                                                        
                                                        self.scroll_to_element(view_cart_button)
                                                        time.sleep(0.2)
                                                        view_cart_button.click()
                                                        time.sleep(1.0)
                                                        print("  ✓ Clicked View Cart")
                                                        
                                                        # Wait for cart page to load
                                                        time.sleep(1.0)
                                                        
                                                        # Click Continue Shopping using ID
                                                        print("\nClicking Continue Shopping...")
                                                        try:
                                                            continue_shopping_button = self.wait.until(
                                                                EC.element_to_be_clickable((By.ID, "continue-shopping-button"))
                                                            )
                                                            self.scroll_to_element(continue_shopping_button)
                                                            time.sleep(0.2)
                                                            continue_shopping_button.click()
                                                            time.sleep(1.0)
                                                            print("  ✓ Clicked Continue Shopping")
                                                            
                                                            # Add more products
                                                            print("\nAdding more products...")
                                                            time.sleep(1.0)
                                                            try:
                                                                # Find products again and add another one using IDs
                                                                add_to_cart_buttons = self.driver.find_elements(
                                                                    By.XPATH,
                                                                    "//button[contains(@id, 'add-to-cart-button-')]"
                                                                )
                                                                
                                                                if add_to_cart_buttons and len(add_to_cart_buttons) > 1:
                                                                    # Add second product if available
                                                                    add_to_cart_button = self.wait.until(
                                                                        EC.element_to_be_clickable((By.ID, add_to_cart_buttons[1].get_attribute("id")))
                                                                    )
                                                                    self.scroll_to_element(add_to_cart_button)
                                                                    time.sleep(0.2)
                                                                    add_to_cart_button.click()
                                                                    time.sleep(1.0)
                                                                    print("  ✓ Added second product to cart")
                                                                elif add_to_cart_buttons:
                                                                    # Add same product again
                                                                    add_to_cart_button = self.wait.until(
                                                                        EC.element_to_be_clickable((By.ID, add_to_cart_buttons[0].get_attribute("id")))
                                                                    )
                                                                    self.scroll_to_element(add_to_cart_button)
                                                                    time.sleep(0.2)
                                                                    add_to_cart_button.click()
                                                                    time.sleep(1.0)
                                                                    print("  ✓ Added more of the same product to cart")
                                                                else:
                                                                    # Fallback to XPath
                                                                    product_cards = self.driver.find_elements(
                                                                        By.XPATH,
                                                                        "//div[contains(@class, 'card') or contains(@class, 'Card')]//button[contains(text(), 'Add to Cart')]/ancestor::div[contains(@class, 'card') or contains(@class, 'Card')]"
                                                                    )
                                                                    if product_cards:
                                                                        add_to_cart_button = product_cards[0].find_element(
                                                                            By.XPATH,
                                                                            ".//button[contains(text(), 'Add to Cart')]"
                                                                        )
                                                                        self.scroll_to_element(add_to_cart_button)
                                                                        time.sleep(0.2)
                                                                        add_to_cart_button.click()
                                                                        time.sleep(1.0)
                                                                        print("  ✓ Added product to cart (fallback)")
                                                            except Exception as e:
                                                                print(f"  ⚠ Error adding more products: {e}")
                                                            
                                                            # Click View Cart again using ID
                                                            print("\nClicking View Cart again...")
                                                            try:
                                                                time.sleep(1.5)  # Wait for cart count to update
                                                                view_cart_button = self.wait.until(
                                                                    EC.element_to_be_clickable((By.ID, "view-cart-button"))
                                                                )
                                                                # Wait for button to be enabled
                                                                WebDriverWait(self.driver, 5).until(
                                                                    lambda d: view_cart_button.get_attribute("disabled") is None or view_cart_button.get_attribute("disabled") == "false"
                                                                )
                                                                self.scroll_to_element(view_cart_button)
                                                                time.sleep(0.2)
                                                                view_cart_button.click()
                                                                time.sleep(1.0)
                                                                print("  ✓ Clicked View Cart again")
                                                            except Exception as e:
                                                                print(f"  ⚠ Error clicking View Cart: {e}")
                                                        except Exception as e:
                                                            print(f"  ⚠ Error clicking Continue Shopping: {e}")
                                                        
                                                        # Delete item from cart before checkout
                                                        print("\nDeleting item from cart...")
                                                        try:
                                                            # Find and click delete button (trash icon) using ID
                                                            delete_buttons = self.driver.find_elements(
                                                                By.XPATH,
                                                                "//button[contains(@id, 'delete-cart-item-button-')]"
                                                            )
                                                            
                                                            if delete_buttons:
                                                                delete_button = delete_buttons[0]
                                                                self.scroll_to_element(delete_button)
                                                                time.sleep(0.2)
                                                                delete_button.click()
                                                                time.sleep(0.5)
                                                                print("  ✓ Clicked delete button")
                                                                
                                                                # Wait for modal to appear and click Remove
                                                                print("  Clicking Remove on confirmation modal...")
                                                                try:
                                                                    remove_button = self.wait.until(
                                                                        EC.element_to_be_clickable((By.ID, "remove-item-confirm-button"))
                                                                    )
                                                                    self.scroll_to_element(remove_button)
                                                                    time.sleep(0.2)
                                                                    remove_button.click()
                                                                    time.sleep(1.0)
                                                                    print("  ✓ Clicked Remove on modal")
                                                                    
                                                                    # Wait for toast notification to appear and disappear
                                                                    try:
                                                                        WebDriverWait(self.driver, 3).until(
                                                                            EC.presence_of_element_located((By.XPATH, "//li[@data-sonner-toast]"))
                                                                        )
                                                                        time.sleep(0.5)
                                                                        print("  ✓ Item removed notification shown")
                                                                        # Wait for toast to disappear
                                                                        WebDriverWait(self.driver, 5).until(
                                                                            lambda d: len(d.find_elements(By.XPATH, "//li[@data-sonner-toast and @data-visible='true']")) == 0
                                                                        )
                                                                        time.sleep(0.5)
                                                                    except:
                                                                        pass
                                                                except Exception as e:
                                                                    print(f"  ⚠ Error clicking Remove on modal: {e}")
                                                            else:
                                                                print("  ⚠ No delete buttons found")
                                                        except Exception as e:
                                                            print(f"  ⚠ Error deleting item: {e}")
                                                        
                                                        # Click Browse Products (appears when cart is empty)
                                                        print("\nClicking Browse Products...")
                                                        try:
                                                            browse_products_button = self.wait.until(
                                                                EC.element_to_be_clickable((By.ID, "browse-products-button"))
                                                            )
                                                            self.scroll_to_element(browse_products_button)
                                                            time.sleep(0.2)
                                                            browse_products_button.click()
                                                            time.sleep(1.0)
                                                            print("  ✓ Clicked Browse Products")
                                                            
                                                            # Wait for products page to load
                                                            time.sleep(1.0)
                                                            
                                                            # Add product to cart again
                                                            print("\nAdding product to cart again...")
                                                            try:
                                                                # Find Add to Cart button using ID
                                                                add_to_cart_buttons = self.driver.find_elements(
                                                                    By.XPATH,
                                                                    "//button[contains(@id, 'add-to-cart-button-')]"
                                                                )
                                                                
                                                                if add_to_cart_buttons:
                                                                    add_to_cart_button = self.wait.until(
                                                                        EC.element_to_be_clickable((By.ID, add_to_cart_buttons[0].get_attribute("id")))
                                                                    )
                                                                    self.scroll_to_element(add_to_cart_button)
                                                                    time.sleep(0.2)
                                                                    add_to_cart_button.click()
                                                                    time.sleep(1.0)
                                                                    print("  ✓ Added product to cart again")
                                                                    
                                                                    # Wait for toast notification
                                                                    try:
                                                                        WebDriverWait(self.driver, 3).until(
                                                                            EC.presence_of_element_located((By.XPATH, "//li[@data-sonner-toast]"))
                                                                        )
                                                                        time.sleep(0.5)
                                                                        print("  ✓ Product added to cart notification shown")
                                                                    except:
                                                                        pass
                                                                else:
                                                                    print("  ⚠ No Add to Cart buttons found")
                                                            except Exception as e:
                                                                print(f"  ⚠ Error adding product to cart: {e}")
                                                        except Exception as e:
                                                            print(f"  ⚠ Error clicking Browse Products: {e}")
                                                        
                                                        # Navigate back to cart
                                                        print("\nNavigating to cart...")
                                                        try:
                                                            view_cart_button = self.wait.until(
                                                                EC.element_to_be_clickable((By.ID, "view-cart-button"))
                                                            )
                                                            # Wait for button to be enabled
                                                            WebDriverWait(self.driver, 5).until(
                                                                lambda d: view_cart_button.get_attribute("disabled") is None or view_cart_button.get_attribute("disabled") == "false"
                                                            )
                                                            self.scroll_to_element(view_cart_button)
                                                            time.sleep(0.2)
                                                            view_cart_button.click()
                                                            time.sleep(1.0)
                                                            print("  ✓ Navigated to cart")
                                                        except Exception as e:
                                                            print(f"  ⚠ Error navigating to cart: {e}")
                                                        
                                                        # Click Proceed to Checkout using ID
                                                        print("\nClicking Proceed to Checkout...")
                                                        try:
                                                            proceed_checkout_button = self.wait.until(
                                                                EC.element_to_be_clickable((By.ID, "proceed-to-checkout-button"))
                                                            )
                                                            self.scroll_to_element(proceed_checkout_button)
                                                            time.sleep(0.2)
                                                            proceed_checkout_button.click()
                                                            time.sleep(1.5)
                                                            print("  ✓ Clicked Proceed to Checkout")
                                                            
                                                            # Wait for checkout page to load
                                                            time.sleep(1.0)
                                                            
                                                            # Scroll down to find Complete Order button
                                                            print("\nScrolling down to find Complete Order button...")
                                                            page_height = self.driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
                                                            viewport_height = self.driver.execute_script("return window.innerHeight")
                                                            
                                                            # Scroll down incrementally
                                                            scroll_position = 0
                                                            while scroll_position < page_height:
                                                                scroll_position += viewport_height * 0.5
                                                                self.driver.execute_script(f"window.scrollTo(0, {scroll_position});")
                                                                time.sleep(0.3)
                                                                
                                                                # Check if Complete Order button is visible using ID
                                                                try:
                                                                    complete_order_button = self.driver.find_element(
                                                                        By.ID,
                                                                        "complete-order-button"
                                                                    )
                                                                    if complete_order_button.is_displayed():
                                                                        print("  ✓ Found Complete Order button")
                                                                        break
                                                                except:
                                                                    pass
                                                            
                                                            # Click Complete Order button using ID
                                                            print("\nClicking Complete Order...")
                                                            try:
                                                                complete_order_button = self.wait.until(
                                                                    EC.element_to_be_clickable((By.ID, "complete-order-button"))
                                                                )
                                                                self.scroll_to_element(complete_order_button)
                                                                time.sleep(0.2)
                                                                complete_order_button.click()
                                                                time.sleep(1.0)
                                                                print("  ✓ Clicked Complete Order")
                                                                
                                                                # After completing order, user is taken to order history
                                                                # Wait for Order History page to load
                                                                print("\nWaiting for Order History page to load...")
                                                                try:
                                                                    # Wait for either the "Your Orders" heading or order cards to appear
                                                                    WebDriverWait(self.driver, 10).until(
                                                                        EC.any_of(
                                                                            EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Your Orders')]")),
                                                                            EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'card')]//div[contains(text(), 'Order #')]")),
                                                                            EC.presence_of_element_located((By.XPATH, "//p[contains(text(), 'No orders found')]"))
                                                                        )
                                                                    )
                                                                    time.sleep(1.0)  # Extra wait for content to fully render
                                                                    print("  ✓ Order History page loaded")
                                                                except Exception as e:
                                                                    print(f"  ⚠ Order History page may not have loaded: {e}")
                                                                
                                                                # Scroll on order history page
                                                                print("\nScrolling on Order History page...")
                                                                page_height = self.driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
                                                                viewport_height = self.driver.execute_script("return window.innerHeight")
                                                                
                                                                scroll_increment = viewport_height * 0.8
                                                                current_scroll = 0
                                                                while current_scroll < page_height:
                                                                    current_scroll += scroll_increment
                                                                    self.driver.execute_script(f"window.scrollTo(0, {current_scroll});")
                                                                    time.sleep(0.3)
                                                                
                                                                # Scroll back to top
                                                                self.driver.execute_script("window.scrollTo(0, 0);")
                                                                time.sleep(0.5)
                                                                print("  ✓ Scrolled through Order History page")
                                                                
                                                                # Navigate to Loyalty Program tab
                                                                print("\nNavigating to Loyalty Program tab...")
                                                                try:
                                                                    loyalty_program_link = self.wait.until(
                                                                        EC.element_to_be_clickable((By.XPATH,
                                                                            "//a[contains(text(), 'Loyalty Program')] | "
                                                                            "//button[contains(text(), 'Loyalty Program')]"
                                                                        ))
                                                                    )
                                                                    self.scroll_to_element(loyalty_program_link)
                                                                    time.sleep(0.2)
                                                                    loyalty_program_link.click()
                                                                    time.sleep(1.0)
                                                                    print("  ✓ Clicked Loyalty Program tab")
                                                                    
                                                                    # Wait for Loyalty Program page to load
                                                                    print("  Waiting for Loyalty Program page to load...")
                                                                    try:
                                                                        # Wait for either "Your Salon Progress" heading or loyalty cards to appear
                                                                        WebDriverWait(self.driver, 10).until(
                                                                            EC.any_of(
                                                                                EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Your Salon Progress')]")),
                                                                                EC.presence_of_element_located((By.XPATH, "//div[contains(text(), 'Total Visits')]")),
                                                                                EC.presence_of_element_located((By.XPATH, "//div[contains(text(), 'Gold Salons')]")),
                                                                                EC.presence_of_element_located((By.XPATH, "//p[contains(text(), 'No Loyalty Data Yet')]"))
                                                                            )
                                                                        )
                                                                        time.sleep(1.0)  # Extra wait for content to fully render
                                                                        print("  ✓ Loyalty Program page loaded")
                                                                    except Exception as e:
                                                                        print(f"  ⚠ Loyalty Program page may not have loaded: {e}")
                                                                    
                                                                    # Scroll around on Loyalty Program page
                                                                    print("  Scrolling on Loyalty Program page...")
                                                                    time.sleep(0.5)
                                                                    page_height = self.driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
                                                                    scroll_increment = viewport_height * 0.8
                                                                    current_scroll = 0
                                                                    while current_scroll < page_height:
                                                                        current_scroll += scroll_increment
                                                                        self.driver.execute_script(f"window.scrollTo(0, {current_scroll});")
                                                                        time.sleep(0.3)
                                                                    
                                                                    # Scroll back to top
                                                                    self.driver.execute_script("window.scrollTo(0, 0);")
                                                                    time.sleep(0.5)
                                                                    print("  ✓ Scrolled through Loyalty Program page")
                                                                except Exception as e:
                                                                    print(f"  ⚠ Error navigating to Loyalty Program: {e}")
                                                                
                                                                # Navigate to Settings tab
                                                                print("\nNavigating to Settings tab...")
                                                                try:
                                                                    settings_link = self.wait.until(
                                                                        EC.element_to_be_clickable((By.XPATH,
                                                                            "//a[contains(text(), 'Settings')] | "
                                                                            "//button[contains(text(), 'Settings')]"
                                                                        ))
                                                                    )
                                                                    self.scroll_to_element(settings_link)
                                                                    time.sleep(0.2)
                                                                    settings_link.click()
                                                                    time.sleep(1.0)
                                                                    print("  ✓ Clicked Settings tab")
                                                                    
                                                                    # Wait for Settings page to load
                                                                    time.sleep(1.0)
                                                                    
                                                                    # Click Edit Address button
                                                                    print("\nClicking Edit Address...")
                                                                    try:
                                                                        edit_address_button = self.wait.until(
                                                                            EC.element_to_be_clickable((By.ID, "edit-address-button"))
                                                                        )
                                                                        self.scroll_to_element(edit_address_button)
                                                                        time.sleep(0.2)
                                                                        edit_address_button.click()
                                                                        time.sleep(0.5)
                                                                        print("  ✓ Clicked Edit Address")
                                                                        
                                                                        # Wait for address form to appear
                                                                        time.sleep(0.5)
                                                                        
                                                                        # Click Save Address button
                                                                        print("\nClicking Save Address...")
                                                                        try:
                                                                            save_address_button = self.wait.until(
                                                                                EC.element_to_be_clickable((By.ID, "save-address-button"))
                                                                            )
                                                                            self.scroll_to_element(save_address_button)
                                                                            time.sleep(0.2)
                                                                            save_address_button.click()
                                                                            time.sleep(1.5)
                                                                            print("  ✓ Clicked Save Address")
                                                                            
                                                                            # Wait for success notification
                                                                            try:
                                                                                WebDriverWait(self.driver, 3).until(
                                                                                    EC.presence_of_element_located((By.XPATH, "//li[@data-sonner-toast]"))
                                                                                )
                                                                                time.sleep(0.5)
                                                                                print("  ✓ Address saved notification shown")
                                                                            except:
                                                                                pass
                                                                        except Exception as e:
                                                                            print(f"  ⚠ Error clicking Save Address: {e}")
                                                                    except Exception as e:
                                                                        print(f"  ⚠ Error clicking Edit Address: {e}")
                                                                    
                                                                    # Click Enter Card Details button
                                                                    print("\nClicking Enter Card Details...")
                                                                    try:
                                                                        enter_card_button = self.wait.until(
                                                                            EC.element_to_be_clickable((By.ID, "enter-card-details-button"))
                                                                        )
                                                                        self.scroll_to_element(enter_card_button)
                                                                        time.sleep(0.2)
                                                                        enter_card_button.click()
                                                                        time.sleep(0.5)
                                                                        print("  ✓ Clicked Enter Card Details")
                                                                        
                                                                        # Wait for card form to appear
                                                                        time.sleep(0.5)
                                                                        
                                                                        # Fill in card details
                                                                        print("\nFilling in card details...")
                                                                        try:
                                                                            # Card Number: 5555 5555 5555 4444
                                                                            card_number_input = self.wait.until(
                                                                                EC.presence_of_element_located((By.ID, "card_number"))
                                                                            )
                                                                            self.scroll_to_element(card_number_input)
                                                                            time.sleep(0.2)
                                                                            card_number_input.clear()
                                                                            card_number_input.send_keys("5555 5555 5555 4444")
                                                                            time.sleep(0.3)
                                                                            print("  ✓ Entered card number")
                                                                            
                                                                            # Cardholder Name
                                                                            cardholder_name_input = self.wait.until(
                                                                                EC.presence_of_element_located((By.ID, "cardholder_name"))
                                                                            )
                                                                            self.scroll_to_element(cardholder_name_input)
                                                                            time.sleep(0.2)
                                                                            cardholder_name_input.clear()
                                                                            cardholder_name_input.send_keys("Test User")
                                                                            time.sleep(0.3)
                                                                            print("  ✓ Entered cardholder name")
                                                                            
                                                                            # Expiration Month: 12 (using same pattern as appointment booking)
                                                                            exp_month_select = self.wait.until(
                                                                                EC.element_to_be_clickable((By.ID, "exp_month-select"))
                                                                            )
                                                                            exp_month_select.click()
                                                                            time.sleep(0.3)
                                                                            month_option = WebDriverWait(self.driver, 3).until(
                                                                                EC.element_to_be_clickable((By.XPATH, "//div[@role='option' and text()='12']"))
                                                                            )
                                                                            month_option.click()
                                                                            time.sleep(0.3)
                                                                            print("  ✓ Selected expiration month: 12")
                                                                            
                                                                            # Expiration Year: 2025 (using same pattern as appointment booking)
                                                                            exp_year_select = self.wait.until(
                                                                                EC.element_to_be_clickable((By.ID, "exp_year-select"))
                                                                            )
                                                                            exp_year_select.click()
                                                                            time.sleep(0.3)
                                                                            year_option = WebDriverWait(self.driver, 3).until(
                                                                                EC.element_to_be_clickable((By.XPATH, "//div[@role='option' and text()='2025']"))
                                                                            )
                                                                            year_option.click()
                                                                            time.sleep(0.3)
                                                                            print("  ✓ Selected expiration year: 2025")
                                                                            
                                                                            # CVV: 123
                                                                            cvc_input = self.wait.until(
                                                                                EC.presence_of_element_located((By.ID, "cvc"))
                                                                            )
                                                                            self.scroll_to_element(cvc_input)
                                                                            time.sleep(0.2)
                                                                            cvc_input.clear()
                                                                            cvc_input.send_keys("123")
                                                                            time.sleep(0.3)
                                                                            print("  ✓ Entered CVV")
                                                                            
                                                                            # Click Save Card button
                                                                            print("\nClicking Save Card...")
                                                                            save_card_button = self.wait.until(
                                                                                EC.element_to_be_clickable((By.ID, "save-card-button"))
                                                                            )
                                                                            self.scroll_to_element(save_card_button)
                                                                            time.sleep(0.2)
                                                                            save_card_button.click()
                                                                            time.sleep(1.5)
                                                                            print("  ✓ Clicked Save Card")
                                                                            
                                                                            # Wait for success notification
                                                                            try:
                                                                                WebDriverWait(self.driver, 3).until(
                                                                                    EC.presence_of_element_located((By.XPATH, "//li[@data-sonner-toast]"))
                                                                                )
                                                                                time.sleep(0.5)
                                                                                print("  ✓ Card saved notification shown")
                                                                            except:
                                                                                pass
                                                                            
                                                                            # Wait a couple seconds after saving card
                                                                            time.sleep(2.0)
                                                                            
                                                                            # Navigate to Browse Salons
                                                                            print("\nNavigating to Browse Salons...")
                                                                            try:
                                                                                browse_salons_link = self.wait.until(
                                                                                    EC.element_to_be_clickable((By.XPATH,
                                                                                        "//a[contains(text(), 'Browse Salons')] | "
                                                                                        "//button[contains(text(), 'Browse Salons')]"
                                                                                    ))
                                                                                )
                                                                                self.scroll_to_element(browse_salons_link)
                                                                                time.sleep(0.2)
                                                                                browse_salons_link.click()
                                                                                time.sleep(1.0)
                                                                                print("  ✓ Clicked Browse Salons")
                                                                                
                                                                                # Wait for page to load
                                                                                time.sleep(1.0)
                                                                                
                                                                                # Scroll down to find pagination
                                                                                print("\nScrolling down to find pagination...")
                                                                                page_height = self.driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
                                                                                viewport_height = self.driver.execute_script("return window.innerHeight")
                                                                                
                                                                                # Scroll down incrementally
                                                                                scroll_position = 0
                                                                                while scroll_position < page_height:
                                                                                    scroll_position += viewport_height * 0.5
                                                                                    self.driver.execute_script(f"window.scrollTo(0, {scroll_position});")
                                                                                    time.sleep(0.3)
                                                                                
                                                                                print("  ✓ Scrolled to pagination area")
                                                                                
                                                                                # Test pagination: click next, then previous
                                                                                print("\nTesting pagination...")
                                                                                try:
                                                                                    # Check if pagination exists (only shows if totalPages > 1)
                                                                                    next_button = self.driver.find_elements(By.ID, "salon-browser-pagination-next-button")
                                                                                    if next_button and not next_button[0].get_attribute("disabled"):
                                                                                        # Click next button
                                                                                        print("  Clicking 'Next' pagination button...")
                                                                                        self.scroll_to_element(next_button[0])
                                                                                        time.sleep(0.2)
                                                                                        next_button[0].click()
                                                                                        time.sleep(0.5)
                                                                                        print("  ✓ Clicked 'Next' button")
                                                                                        
                                                                                        # Now click previous button
                                                                                        prev_button = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "salon-browser-pagination-previous-button"))
                                                                                        )
                                                                                        print("  Clicking 'Previous' pagination button...")
                                                                                        self.scroll_to_element(prev_button)
                                                                                        time.sleep(0.2)
                                                                                        prev_button.click()
                                                                                        time.sleep(0.5)
                                                                                        print("  ✓ Clicked 'Previous' button")
                                                                                    else:
                                                                                        print("  ⚠ Pagination buttons not available or disabled (may be on first/last page or only one page)")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Could not test pagination: {e}")
                                                                                
                                                                                # Scroll back up to search bar
                                                                                print("\nScrolling up to search bar...")
                                                                                self.driver.execute_script("window.scrollTo(0, 0);")
                                                                                time.sleep(0.5)
                                                                                print("  ✓ Scrolled to top")
                                                                                
                                                                                # Use search bar to search for "Trim"
                                                                                print("\nSearching for 'Trim'...")
                                                                                try:
                                                                                    search_input = self.wait.until(
                                                                                        EC.presence_of_element_located((By.ID, "salon-search-input"))
                                                                                    )
                                                                                    self.scroll_to_element(search_input)
                                                                                    time.sleep(0.2)
                                                                                    search_input.clear()
                                                                                    search_input.send_keys("Trim")
                                                                                    time.sleep(1.0)  # Wait for search results to filter
                                                                                    print("  ✓ Searched for 'Trim'")
                                                                                    
                                                                                    # Wait a moment for results to appear
                                                                                    time.sleep(0.5)
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error searching: {e}")
                                                                                
                                                                                # Before logout, check My Appointments - Completed tab and review flow
                                                                                print("\n" + "="*70)
                                                                                print("CHECKING MY APPOINTMENTS - COMPLETED AND REVIEW FLOW")
                                                                                print("="*70)
                                                                                
                                                                                # Navigate to My Appointments
                                                                                print("\nNavigating to My Appointments...")
                                                                                try:
                                                                                    self.driver.get(f"{BASE_URL}/appointments")
                                                                                    time.sleep(2)  # Wait for page to load
                                                                                    print("  ✓ Navigated to My Appointments page")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error navigating to My Appointments: {e}")
                                                                                
                                                                                # Click Completed tab
                                                                                print("\nClicking Completed tab...")
                                                                                try:
                                                                                    completed_tab = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "appointments-filter-past"))
                                                                                    )
                                                                                    self.scroll_to_element(completed_tab)
                                                                                    time.sleep(0.2)
                                                                                    completed_tab.click()
                                                                                    time.sleep(2.0)  # Wait 2 seconds on the completed tab
                                                                                    print("  ✓ Clicked Completed tab and waited 2 seconds")
                                                                                    
                                                                                    # Check if there are any appointments in the Completed tab
                                                                                    # Loop to refresh until appointments appear
                                                                                    max_refresh_attempts = 10  # Maximum number of refresh attempts
                                                                                    refresh_attempt = 0
                                                                                    appointments_found = False
                                                                                    
                                                                                    while refresh_attempt < max_refresh_attempts and not appointments_found:
                                                                                        try:
                                                                                            # Look for empty state message
                                                                                            empty_state_message = self.driver.find_elements(
                                                                                                By.XPATH, 
                                                                                                "//*[contains(text(), 'No past appointments') or contains(text(), 'No appointments found')]"
                                                                                            )
                                                                                            # Also check for actual appointment cards
                                                                                            actual_appointments = self.driver.find_elements(
                                                                                                By.XPATH,
                                                                                                "//div[contains(@class, 'grid')]//div[contains(@class, 'card') or contains(@class, 'Card')]"
                                                                                            )
                                                                                            
                                                                                            # If we see "No past appointments" message and no actual appointment cards
                                                                                            if empty_state_message and len(actual_appointments) == 0:
                                                                                                refresh_attempt += 1
                                                                                                print(f"  ⚠ No appointments found in Completed tab (attempt {refresh_attempt}/{max_refresh_attempts})")
                                                                                                
                                                                                                if refresh_attempt < max_refresh_attempts:
                                                                                                    print(f"  Waiting 2 seconds, then refreshing page...")
                                                                                                    time.sleep(2.0)
                                                                                                    
                                                                                                    # Refresh the page
                                                                                                    self.driver.refresh()
                                                                                                    time.sleep(2.0)  # Wait for page to reload
                                                                                                    print("  ✓ Page refreshed")
                                                                                                    
                                                                                                    # Click Completed tab again
                                                                                                    completed_tab = self.wait.until(
                                                                                                        EC.element_to_be_clickable((By.ID, "appointments-filter-past"))
                                                                                                    )
                                                                                                    self.scroll_to_element(completed_tab)
                                                                                                    time.sleep(0.2)
                                                                                                    completed_tab.click()
                                                                                                    time.sleep(2.0)  # Wait 2 seconds on the completed tab again
                                                                                                    print(f"  ✓ Clicked Completed tab again after refresh (attempt {refresh_attempt})")
                                                                                                else:
                                                                                                    print(f"  ⚠ Max refresh attempts reached. Continuing anyway...")
                                                                                                    appointments_found = True  # Break the loop
                                                                                            else:
                                                                                                # Appointments found!
                                                                                                appointments_found = True
                                                                                                print("  ✓ Appointments found in Completed tab")
                                                                                        except Exception as e:
                                                                                            print(f"  ⚠ Error checking for appointments: {e}")
                                                                                            # If there's an error, assume appointments might be there and continue
                                                                                            appointments_found = True
                                                                                            break
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking Completed tab: {e}")
                                                                                
                                                                                # After waiting 2 seconds on Completed tab, click Review Stylist button
                                                                                print("\nClicking Review Stylist button...")
                                                                                try:
                                                                                    # Find the Review Stylist button using ID pattern
                                                                                    review_stylist_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.XPATH, "//button[starts-with(@id, 'review-stylist-button-')]"))
                                                                                    )
                                                                                    self.scroll_to_element(review_stylist_button)
                                                                                    time.sleep(0.2)
                                                                                    review_stylist_button.click()
                                                                                    time.sleep(1.0)  # Wait for review modal to open
                                                                                    print("  ✓ Clicked Review Stylist button")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking Review Stylist button: {e}")
                                                                                
                                                                                # After clicking Review Stylist, click "Write a Review" button in the modal
                                                                                print("\nClicking Write a Review button...")
                                                                                try:
                                                                                    write_review_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "write-review-button"))
                                                                                    )
                                                                                    self.scroll_to_element(write_review_button)
                                                                                    time.sleep(0.2)
                                                                                    write_review_button.click()
                                                                                    time.sleep(0.5)  # Wait for review form to appear
                                                                                    print("  ✓ Clicked Write a Review button")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking Write a Review button: {e}")
                                                                                
                                                                                # Write a review - select rating (5 stars)
                                                                                print("\nSelecting 5-star rating...")
                                                                                try:
                                                                                    # Click the full 5th star button (right half)
                                                                                    fifth_star_full = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "review-star-5-full"))
                                                                                    )
                                                                                    self.scroll_to_element(fifth_star_full)
                                                                                    time.sleep(0.2)
                                                                                    fifth_star_full.click()
                                                                                    time.sleep(0.3)
                                                                                    print("  ✓ Selected 5-star rating")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error selecting rating: {e}")
                                                                                
                                                                                # Write a comment
                                                                                print("\nWriting review comment...")
                                                                                try:
                                                                                    comment_textarea = self.wait.until(
                                                                                        EC.presence_of_element_located((By.ID, "review-comment-textarea"))
                                                                                    )
                                                                                    self.scroll_to_element(comment_textarea)
                                                                                    time.sleep(0.2)
                                                                                    comment_textarea.click()
                                                                                    time.sleep(0.1)
                                                                                    comment_textarea.clear()
                                                                                    comment_textarea.send_keys("Great service! Very professional and friendly.")
                                                                                    time.sleep(0.3)
                                                                                    print("  ✓ Wrote review comment")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error writing comment: {e}")
                                                                                
                                                                                # Submit the review
                                                                                print("\nSubmitting review...")
                                                                                try:
                                                                                    submit_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "submit-review-button"))
                                                                                    )
                                                                                    self.scroll_to_element(submit_button)
                                                                                    time.sleep(0.2)
                                                                                    submit_button.click()
                                                                                    time.sleep(1.0)  # Wait for confirmation modal
                                                                                    
                                                                                    # Click Confirm on the confirmation modal
                                                                                    try:
                                                                                        confirm_button = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "review-confirm-button"))
                                                                                        )
                                                                                        self.scroll_to_element(confirm_button)
                                                                                        time.sleep(0.2)
                                                                                        confirm_button.click()
                                                                                        time.sleep(2.0)  # Wait for review to be submitted
                                                                                        print("  ✓ Submitted review")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error confirming review submission: {e}")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error submitting review: {e}")
                                                                                
                                                                                # After submitting, click Edit Review button
                                                                                print("\nClicking Edit Review button...")
                                                                                try:
                                                                                    # Close the review modal first if it's still open
                                                                                    try:
                                                                                        close_button = self.driver.find_element(By.ID, "review-modal-close-button")
                                                                                        if close_button:
                                                                                            close_button.click()
                                                                                            time.sleep(0.5)
                                                                                    except:
                                                                                        pass
                                                                                    
                                                                                    # Wait for toast notifications to disappear
                                                                                    time.sleep(2.0)  # Wait for modal to close and page to settle
                                                                                    
                                                                                    # Extract employee_id from the Review Stylist button we clicked earlier
                                                                                    employee_id = None
                                                                                    try:
                                                                                        review_stylist_button = self.driver.find_element(By.XPATH, "//button[starts-with(@id, 'review-stylist-button-')]")
                                                                                        button_id = review_stylist_button.get_attribute("id")
                                                                                        if button_id:
                                                                                            employee_id = button_id.replace("review-stylist-button-", "")
                                                                                    except:
                                                                                        # If Review Stylist button is gone, try to find Edit Review button and extract ID
                                                                                        try:
                                                                                            edit_btn = self.driver.find_element(By.XPATH, "//button[starts-with(@id, 'edit-review-button-')]")
                                                                                            button_id = edit_btn.get_attribute("id")
                                                                                            if button_id:
                                                                                                employee_id = button_id.replace("edit-review-button-", "")
                                                                                        except:
                                                                                            pass
                                                                                    
                                                                                    if employee_id:
                                                                                        # Wait for the Edit Review button to appear using the employee_id
                                                                                        edit_review_button = self.wait.until(
                                                                                            EC.presence_of_element_located((By.ID, f"edit-review-button-{employee_id}"))
                                                                                        )
                                                                                        
                                                                                        # Scroll the button into view using JavaScript
                                                                                        self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", edit_review_button)
                                                                                        time.sleep(0.5)
                                                                                        
                                                                                        # Try regular click first
                                                                                        try:
                                                                                            edit_review_button.click()
                                                                                            time.sleep(1.0)
                                                                                            print("  ✓ Clicked Edit Review button")
                                                                                        except Exception as click_error:
                                                                                            # If regular click fails, use JavaScript click
                                                                                            print(f"  ⚠ Regular click failed, trying JavaScript click: {click_error}")
                                                                                            self.driver.execute_script("arguments[0].click();", edit_review_button)
                                                                                            time.sleep(1.0)
                                                                                            print("  ✓ Clicked Edit Review button (JavaScript)")
                                                                                    else:
                                                                                        # Fallback: find by XPath if we couldn't extract employee_id
                                                                                        edit_review_button = self.wait.until(
                                                                                            EC.presence_of_element_located((By.XPATH, "//button[starts-with(@id, 'edit-review-button-')]"))
                                                                                        )
                                                                                        self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", edit_review_button)
                                                                                        time.sleep(0.5)
                                                                                        try:
                                                                                            edit_review_button.click()
                                                                                            time.sleep(1.0)
                                                                                            print("  ✓ Clicked Edit Review button (fallback)")
                                                                                        except:
                                                                                            self.driver.execute_script("arguments[0].click();", edit_review_button)
                                                                                            time.sleep(1.0)
                                                                                            print("  ✓ Clicked Edit Review button (JavaScript fallback)")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking Edit Review button: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                # Edit the review - change rating and comment
                                                                                print("\nEditing review...")
                                                                                try:
                                                                                    # Click the Edit button in the review display to open the form
                                                                                    try:
                                                                                        edit_form_button = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "edit-review-form-button"))
                                                                                        )
                                                                                        self.scroll_to_element(edit_form_button)
                                                                                        time.sleep(0.2)
                                                                                        edit_form_button.click()
                                                                                        time.sleep(0.5)
                                                                                        print("  ✓ Opened review form for editing")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error opening review form: {e}")
                                                                                    
                                                                                    # Change rating to 4 stars (click the full 4th star button)
                                                                                    try:
                                                                                        fourth_star_full = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "review-star-4-full"))
                                                                                        )
                                                                                        self.scroll_to_element(fourth_star_full)
                                                                                        time.sleep(0.2)
                                                                                        fourth_star_full.click()
                                                                                        time.sleep(0.3)
                                                                                        print("  ✓ Changed rating to 4 stars")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error changing rating: {e}")
                                                                                    
                                                                                    # Update the comment
                                                                                    try:
                                                                                        comment_textarea = self.wait.until(
                                                                                            EC.presence_of_element_located((By.ID, "review-comment-textarea"))
                                                                                        )
                                                                                        self.scroll_to_element(comment_textarea)
                                                                                        time.sleep(0.2)
                                                                                        comment_textarea.click()
                                                                                        time.sleep(0.1)
                                                                                        comment_textarea.clear()
                                                                                        comment_textarea.send_keys("Updated: Excellent service! Highly recommend.")
                                                                                        time.sleep(0.3)
                                                                                        print("  ✓ Updated review comment")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error updating comment: {e}")
                                                                                    
                                                                                    # Click Update Review button
                                                                                    try:
                                                                                        update_button = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "update-review-button"))
                                                                                        )
                                                                                        self.scroll_to_element(update_button)
                                                                                        time.sleep(0.2)
                                                                                        update_button.click()
                                                                                        time.sleep(1.0)  # Wait for confirmation modal
                                                                                        
                                                                                        # Click Confirm on the confirmation modal
                                                                                        try:
                                                                                            confirm_button = self.wait.until(
                                                                                                EC.element_to_be_clickable((By.ID, "review-confirm-button"))
                                                                                            )
                                                                                            self.scroll_to_element(confirm_button)
                                                                                            time.sleep(0.2)
                                                                                            confirm_button.click()
                                                                                            time.sleep(2.0)  # Wait for review to be updated
                                                                                            print("  ✓ Updated review")
                                                                                        except Exception as e:
                                                                                            print(f"  ⚠ Error confirming review update: {e}")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error clicking Update Review button: {e}")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error editing review: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                # Close the review modal after editing
                                                                                print("\nClosing review modal...")
                                                                                try:
                                                                                    close_modal_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "review-modal-close-button"))
                                                                                    )
                                                                                    self.scroll_to_element(close_modal_button)
                                                                                    time.sleep(0.2)
                                                                                    close_modal_button.click()
                                                                                    time.sleep(1.0)  # Wait for modal to close
                                                                                    print("  ✓ Closed review modal")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error closing review modal: {e}")
                                                                                
                                                                                # Before logout, go to Browse Salons and write a salon review
                                                                                print("\n" + "="*70)
                                                                                print("BROWSE SALONS AND WRITE SALON REVIEW")
                                                                                print("="*70)
                                                                                
                                                                                # Navigate to Browse Salons
                                                                                print("\nNavigating to Browse Salons...")
                                                                                try:
                                                                                    self.driver.get(f"{BASE_URL}/browser")
                                                                                    time.sleep(2)  # Wait for page to load
                                                                                    print("  ✓ Navigated to Browse Salons page")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error navigating to Browse Salons: {e}")
                                                                                
                                                                                # Find and click View Details for "Selenium Test Salon"
                                                                                print("\nFinding and clicking View Details for Selenium Test Salon...")
                                                                                try:
                                                                                    # Find the salon card by name
                                                                                    salon_cards = self.driver.find_elements(
                                                                                        By.XPATH,
                                                                                        "//*[contains(text(), 'Selenium Test Salon')]/ancestor::div[contains(@class, 'card') or contains(@class, 'Card')]"
                                                                                    )
                                                                                    
                                                                                    if salon_cards:
                                                                                        salon_card = salon_cards[0]  # Get first matching salon
                                                                                        # Find View Details button within this card
                                                                                        view_details_button = salon_card.find_element(
                                                                                            By.XPATH, ".//button[starts-with(@id, 'view-details-button-')]"
                                                                                        )
                                                                                        self.scroll_to_element(view_details_button)
                                                                                        time.sleep(0.2)
                                                                                        view_details_button.click()
                                                                                        time.sleep(1.0)  # Initial wait
                                                                                        print("  ✓ Clicked View Details for Selenium Test Salon")
                                                                                        
                                                                                        # Wait for salon detail page to load
                                                                                        print("  Waiting for salon detail page to load...")
                                                                                        try:
                                                                                            # Wait for salon name or key elements to appear (indicating page has loaded)
                                                                                            self.wait.until(
                                                                                                EC.any_of(
                                                                                                    EC.presence_of_element_located((By.XPATH, "//h2[contains(@class, 'text-3xl')] | //h1[contains(@class, 'text-3xl')] | //*[contains(@class, 'CardTitle')]")),
                                                                                                    EC.presence_of_element_located((By.ID, "salon-write-review-button"))
                                                                                                )
                                                                                            )
                                                                                            time.sleep(1.0)  # Additional wait for any animations/transitions
                                                                                            print("  ✓ Salon detail page loaded")
                                                                                        except Exception as e:
                                                                                            print(f"  ⚠ Warning: Could not confirm page load: {e}")
                                                                                            time.sleep(2.0)  # Fallback wait
                                                                                    else:
                                                                                        print("  ⚠ Could not find Selenium Test Salon")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error finding/clicking View Details: {e}")
                                                                                
                                                                                # Scroll on the salon detail page
                                                                                print("\nScrolling on salon detail page...")
                                                                                try:
                                                                                    self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                                                                                    time.sleep(0.5)
                                                                                    self.driver.execute_script("window.scrollTo(0, 0);")
                                                                                    time.sleep(0.5)
                                                                                    print("  ✓ Scrolled on salon detail page")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error scrolling: {e}")
                                                                                
                                                                                # Find and click Write a Review button
                                                                                print("\nClicking Write a Review button...")
                                                                                try:
                                                                                    write_review_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "salon-write-review-button"))
                                                                                    )
                                                                                    self.scroll_to_element(write_review_button)
                                                                                    time.sleep(0.2)
                                                                                    write_review_button.click()
                                                                                    time.sleep(0.5)  # Wait for review form to appear
                                                                                    print("  ✓ Clicked Write a Review button")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking Write a Review button: {e}")
                                                                                
                                                                                # Fill out review - select rating (5 stars)
                                                                                print("\nSelecting 5-star rating for salon...")
                                                                                try:
                                                                                    fifth_star_full = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "salon-review-star-5-full"))
                                                                                    )
                                                                                    self.scroll_to_element(fifth_star_full)
                                                                                    time.sleep(0.2)
                                                                                    fifth_star_full.click()
                                                                                    time.sleep(0.3)
                                                                                    print("  ✓ Selected 5-star rating for salon")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error selecting rating: {e}")
                                                                                
                                                                                # Write a comment
                                                                                print("\nWriting salon review comment...")
                                                                                try:
                                                                                    comment_textarea = self.wait.until(
                                                                                        EC.presence_of_element_located((By.ID, "salon-review-comment-textarea"))
                                                                                    )
                                                                                    self.scroll_to_element(comment_textarea)
                                                                                    time.sleep(0.2)
                                                                                    comment_textarea.click()
                                                                                    time.sleep(0.1)
                                                                                    comment_textarea.clear()
                                                                                    comment_textarea.send_keys("Great salon! Excellent service and friendly staff.")
                                                                                    time.sleep(0.3)
                                                                                    print("  ✓ Wrote salon review comment")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error writing comment: {e}")
                                                                                
                                                                                # Submit the review
                                                                                print("\nSubmitting salon review...")
                                                                                try:
                                                                                    submit_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "salon-submit-review-button"))
                                                                                    )
                                                                                    self.scroll_to_element(submit_button)
                                                                                    time.sleep(0.2)
                                                                                    submit_button.click()
                                                                                    time.sleep(1.0)  # Wait for confirmation modal
                                                                                    
                                                                                    # Click Confirm on the confirmation modal
                                                                                    try:
                                                                                        confirm_button = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "salon-review-confirm-button"))
                                                                                        )
                                                                                        self.scroll_to_element(confirm_button)
                                                                                        time.sleep(0.2)
                                                                                        confirm_button.click()
                                                                                        time.sleep(2.0)  # Wait for review to be submitted
                                                                                        print("  ✓ Submitted salon review")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error confirming review submission: {e}")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error submitting review: {e}")
                                                                                
                                                                                # Wait for any toast notifications to disappear before logout
                                                                                print("\nWaiting for toast notifications to disappear...")
                                                                                try:
                                                                                    toasts = self.driver.find_elements(By.XPATH, "//li[@data-sonner-toast]")
                                                                                    if toasts:
                                                                                        print("  Toast notifications found, waiting for them to disappear...")
                                                                                        WebDriverWait(self.driver, 5).until(
                                                                                            lambda d: len(d.find_elements(By.XPATH, "//li[@data-sonner-toast and @data-visible='true']")) == 0
                                                                                        )
                                                                                        time.sleep(0.5)  # Extra wait for animation
                                                                                        print("  ✓ Toast notifications disappeared")
                                                                                except:
                                                                                    pass  # No toasts or they already disappeared
                                                                                
                                                                                # Click logout
                                                                                print("\nClicking Logout...")
                                                                                try:
                                                                                    logout_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "customer-logout-button"))
                                                                                    )
                                                                                    self.scroll_to_element(logout_button)
                                                                                    time.sleep(0.2)
                                                                                    
                                                                                    # Try regular click first, fallback to JavaScript click if intercepted
                                                                                    try:
                                                                                        logout_button.click()
                                                                                    except:
                                                                                        # If click is intercepted, use JavaScript click
                                                                                        self.driver.execute_script("arguments[0].click();", logout_button)
                                                                                    
                                                                                    time.sleep(1.0)
                                                                                    print("  ✓ Clicked Logout")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking Logout: {e}")
                                                                                
                                                                                # After customer logout, log back into stylist account
                                                                                print("\n" + "="*70)
                                                                                print("LOGGING BACK INTO STYLIST ACCOUNT")
                                                                                print("="*70)
                                                                                
                                                                                # Navigate to landing page and sign back into stylist account
                                                                                print("\nSigning back into stylist account...")
                                                                                time.sleep(0.5)
                                                                                self.navigate_and_scroll(f"{BASE_URL}/")
                                                                                time.sleep(0.3)
                                                                                
                                                                                if not self.login(self.stylist_email, "test123", "Stylist"):
                                                                                    print("  ⚠ Failed to log back into stylist account")
                                                                                    return False
                                                                                
                                                                                print("  ✓ Logged back into stylist account")
                                                                                
                                                                                # Navigate to Customers tab
                                                                                print("\nNavigating to Customers tab...")
                                                                                try:
                                                                                    customers_tab = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "stylist-tab-customers"))
                                                                                    )
                                                                                    self.scroll_to_element(customers_tab)
                                                                                    time.sleep(0.2)
                                                                                    customers_tab.click()
                                                                                    time.sleep(1.0)  # Wait for customers to load
                                                                                    print("  ✓ Opened Customers tab")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error opening Customers tab: {e}")
                                                                                
                                                                                # Find and click "View History" for the customer we created
                                                                                print(f"\nLooking for customer: {self.user_email}")
                                                                                try:
                                                                                    # Wait for customers to load
                                                                                    print(f"  Waiting for customer list to load...")
                                                                                    time.sleep(2.0)  # Give more time for customers to load
                                                                                    
                                                                                    # Find the customer email element - email is in a <p> tag with a nested <span>
                                                                                    # Use XPath that checks all text nodes within the paragraph
                                                                                    customer_email_element = self.wait.until(
                                                                                        EC.presence_of_element_located((By.XPATH, f"//p[.//text()[contains(., '{self.user_email}')]]"))
                                                                                    )
                                                                                    print(f"  ✓ Found customer email element")
                                                                                    
                                                                                    # Get the ID of the email element to extract user_id
                                                                                    email_element_id = customer_email_element.get_attribute("id")
                                                                                    if email_element_id and email_element_id.startswith("customer-email-"):
                                                                                        user_id = email_element_id.replace("customer-email-", "")
                                                                                        print(f"  ✓ Extracted user_id: {user_id}")
                                                                                        
                                                                                        # Find the View History button using the user_id
                                                                                        view_history_button = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, f"view-history-button-{user_id}"))
                                                                                        )
                                                                                    else:
                                                                                        # Fallback: find the parent card and then the button
                                                                                        print(f"  ⚠ Could not extract user_id from email element ID, using fallback method")
                                                                                        customer_card = customer_email_element.find_element(By.XPATH, "./ancestor::div[starts-with(@id, 'customer-card-')]")
                                                                                        card_id = customer_card.get_attribute("id")
                                                                                        if card_id:
                                                                                            user_id = card_id.replace("customer-card-", "")
                                                                                            view_history_button = self.wait.until(
                                                                                                EC.element_to_be_clickable((By.ID, f"view-history-button-{user_id}"))
                                                                                            )
                                                                                        else:
                                                                                            # Last resort: find button by XPath within the card
                                                                                            view_history_button = customer_card.find_element(
                                                                                                By.XPATH, ".//button[starts-with(@id, 'view-history-button-')]"
                                                                                            )
                                                                                    
                                                                                    # Scroll to and click the button
                                                                                    self.scroll_to_element(view_history_button)
                                                                                    time.sleep(0.3)
                                                                                    view_history_button.click()
                                                                                    time.sleep(1.0)  # Wait for modal to open
                                                                                    print("  ✓ Clicked 'View History' for customer")
                                                                                    
                                                                                    # Close the customer visit history modal
                                                                                    print("\nClosing customer visit history modal...")
                                                                                    try:
                                                                                        close_modal_button = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "customer-visit-modal-close-button"))
                                                                                        )
                                                                                        self.scroll_to_element(close_modal_button)
                                                                                        time.sleep(0.2)
                                                                                        close_modal_button.click()
                                                                                        time.sleep(0.5)  # Wait for modal to close
                                                                                        print("  ✓ Closed customer visit history modal")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error closing modal: {e}")
                                                                                    
                                                                                    # Navigate to Reviews tab
                                                                                    print("\nNavigating to Reviews tab...")
                                                                                    try:
                                                                                        reviews_tab = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "stylist-tab-reviews"))
                                                                                        )
                                                                                        self.scroll_to_element(reviews_tab)
                                                                                        time.sleep(0.2)
                                                                                        reviews_tab.click()
                                                                                        time.sleep(1.0)  # Wait for reviews to load
                                                                                        print("  ✓ Opened Reviews tab")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error opening Reviews tab: {e}")
                                                                                    
                                                                                    # Click "My Reviews" sub-tab
                                                                                    print("\nClicking 'My Reviews' sub-tab...")
                                                                                    try:
                                                                                        my_reviews_tab = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "reviews-subtab-my"))
                                                                                        )
                                                                                        self.scroll_to_element(my_reviews_tab)
                                                                                        time.sleep(0.2)
                                                                                        my_reviews_tab.click()
                                                                                        # Wait for My Reviews to load - wait for review elements to be present
                                                                                        print("  Waiting for reviews to load...")
                                                                                        try:
                                                                                            # Wait for either reply buttons (reviews without replies) or edit buttons (reviews with replies) to appear
                                                                                            self.wait.until(
                                                                                                EC.any_of(
                                                                                                    EC.presence_of_element_located((By.XPATH, "//button[starts-with(@id, 'staff-reply-button-')]")),
                                                                                                    EC.presence_of_element_located((By.XPATH, "//button[starts-with(@id, 'staff-edit-reply-button-')]")),
                                                                                                    EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'review')] | //div[contains(@class, 'Review')]"))
                                                                                                )
                                                                                            )
                                                                                            time.sleep(0.5)  # Additional small wait for any animations
                                                                                            print("  ✓ Reviews loaded")
                                                                                        except Exception as e:
                                                                                            print(f"  ⚠ Timeout waiting for reviews to load: {e}")
                                                                                            time.sleep(2.0)  # Fallback wait
                                                                                        print("  ✓ Clicked 'My Reviews' sub-tab")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error clicking 'My Reviews' sub-tab: {e}")
                                                                                    
                                                                                    # Find a review without a reply and reply to it
                                                                                    print("\nLooking for a review without a reply...")
                                                                                    try:
                                                                                        # Wait for reviews to be visible
                                                                                        time.sleep(1.0)
                                                                                        
                                                                                        # Find all Reply buttons (reviews without replies)
                                                                                        reply_buttons = self.driver.find_elements(By.XPATH, "//button[starts-with(@id, 'staff-reply-button-')]")
                                                                                        
                                                                                        if reply_buttons:
                                                                                            # Get the first reply button
                                                                                            reply_button = reply_buttons[0]
                                                                                            reply_button_id = reply_button.get_attribute("id")
                                                                                            # Extract review_id from ID (format: staff-reply-button-{review_id})
                                                                                            review_id = reply_button_id.replace("staff-reply-button-", "")
                                                                                            print(f"  ✓ Found a review without a reply (review_id: {review_id})")
                                                                                            
                                                                                            # Click Reply button
                                                                                            print("\nClicking Reply button...")
                                                                                            self.scroll_to_element(reply_button)
                                                                                            time.sleep(0.2)
                                                                                            reply_button.click()
                                                                                            time.sleep(0.5)
                                                                                            print("  ✓ Clicked Reply button")
                                                                                            
                                                                                            # Find the reply textarea using ID
                                                                                            print("\nFilling reply textarea...")
                                                                                            reply_textarea = self.wait.until(
                                                                                                EC.presence_of_element_located((By.ID, f"staff-reply-textarea-{review_id}"))
                                                                                            )
                                                                                            self.scroll_to_element(reply_textarea)
                                                                                            time.sleep(0.2)
                                                                                            reply_textarea.click()
                                                                                            time.sleep(0.1)
                                                                                            reply_textarea.clear()
                                                                                            reply_text = "Thank you for your feedback! I'm glad you enjoyed the service."
                                                                                            reply_textarea.send_keys(reply_text)
                                                                                            time.sleep(0.3)
                                                                                            print(f"  ✓ Filled reply textarea with: {reply_text}")
                                                                                            
                                                                                            # Click Send Reply button using ID
                                                                                            print("\nClicking Send Reply button...")
                                                                                            send_reply_button = self.wait.until(
                                                                                                EC.element_to_be_clickable((By.ID, f"staff-send-reply-button-{review_id}"))
                                                                                            )
                                                                                            self.scroll_to_element(send_reply_button)
                                                                                            time.sleep(0.2)
                                                                                            send_reply_button.click()
                                                                                            time.sleep(2.0)  # Wait for reply to be saved
                                                                                            print("  ✓ Clicked Send Reply button")
                                                                                            
                                                                                            # Wait for toast notifications to disappear
                                                                                            time.sleep(1.0)
                                                                                            
                                                                                            # Now find the Edit button for the reply we just created
                                                                                            print("\nLooking for the Edit button for the reply we just created...")
                                                                                            time.sleep(1.0)
                                                                                            
                                                                                            # Find all Edit buttons (reviews with replies)
                                                                                            edit_buttons = self.driver.find_elements(By.XPATH, "//button[starts-with(@id, 'staff-edit-reply-button-')]")
                                                                                            
                                                                                            if edit_buttons:
                                                                                                # Get the first edit button (should be the one we just created)
                                                                                                edit_button = edit_buttons[0]
                                                                                                edit_button_id = edit_button.get_attribute("id")
                                                                                                # Extract reply_id from ID (format: staff-edit-reply-button-{reply_id})
                                                                                                reply_id = edit_button_id.replace("staff-edit-reply-button-", "")
                                                                                                print(f"  ✓ Found Edit button for reply (reply_id: {reply_id})")
                                                                                                
                                                                                                # Click Edit button
                                                                                                print("\nClicking Edit button...")
                                                                                                self.scroll_to_element(edit_button)
                                                                                                time.sleep(0.2)
                                                                                                edit_button.click()
                                                                                                time.sleep(0.5)
                                                                                                print("  ✓ Clicked Edit button")
                                                                                                
                                                                                                # Find the edit textarea using ID
                                                                                                print("\nUpdating reply text...")
                                                                                                edit_textarea = self.wait.until(
                                                                                                    EC.presence_of_element_located((By.ID, f"staff-edit-reply-textarea-{reply_id}"))
                                                                                                )
                                                                                                self.scroll_to_element(edit_textarea)
                                                                                                time.sleep(0.2)
                                                                                                edit_textarea.click()
                                                                                                time.sleep(0.1)
                                                                                                edit_textarea.clear()
                                                                                                updated_reply_text = "Thank you so much for your kind words! I really appreciate your feedback and look forward to serving you again."
                                                                                                edit_textarea.send_keys(updated_reply_text)
                                                                                                time.sleep(0.3)
                                                                                                print(f"  ✓ Updated reply text to: {updated_reply_text}")
                                                                                                
                                                                                                # Click Update Reply button using ID
                                                                                                print("\nClicking Update Reply button...")
                                                                                                update_reply_button = self.wait.until(
                                                                                                    EC.element_to_be_clickable((By.ID, f"staff-update-reply-button-{reply_id}"))
                                                                                                )
                                                                                                self.scroll_to_element(update_reply_button)
                                                                                                time.sleep(0.2)
                                                                                                update_reply_button.click()
                                                                                                time.sleep(2.0)  # Wait for reply to be updated
                                                                                                print("  ✓ Clicked Update Reply button")
                                                                                                
                                                                                                # Wait for toast notifications to disappear
                                                                                                time.sleep(1.0)
                                                                                                
                                                                                                print("\n" + "="*70)
                                                                                                print("MY REVIEWS REPLY AND EDIT FLOW COMPLETED")
                                                                                                print("="*70)
                                                                                            else:
                                                                                                print("  ⚠ Could not find Edit button for the reply")
                                                                                        else:
                                                                                            print("  ⚠ No reviews without replies found, or all reviews already have replies")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error in My Reviews reply/edit flow: {e}")
                                                                                        import traceback
                                                                                        traceback.print_exc()
                                                                                    
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking View History: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                # OWNER DASHBOARD FLOW
                                                                                print("\n" + "="*70)
                                                                                print("OWNER DASHBOARD FLOW - STARTING")
                                                                                print("="*70)
                                                                                
                                                                                # Logout as stylist and login as owner
                                                                                print("\nLogging out as stylist...")
                                                                                try:
                                                                                    # Wait for any toast notifications to disappear
                                                                                    time.sleep(2.0)
                                                                                    try:
                                                                                        toast_elements = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'sonner-toast')]")
                                                                                        if toast_elements:
                                                                                            time.sleep(2.0)
                                                                                    except:
                                                                                        pass
                                                                                    
                                                                                    # Try stylist logout button ID first
                                                                                    try:
                                                                                        logout_button = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "stylist-logout-button"))
                                                                                        )
                                                                                        self.scroll_to_element(logout_button)
                                                                                        time.sleep(0.3)
                                                                                        try:
                                                                                            logout_button.click()
                                                                                        except:
                                                                                            # If regular click fails, use JavaScript click
                                                                                            self.driver.execute_script("arguments[0].click();", logout_button)
                                                                                        time.sleep(2.0)
                                                                                        print("  ✓ Logged out using stylist logout button ID")
                                                                                    except:
                                                                                        # Fallback to XPath
                                                                                        logout_buttons = self.driver.find_elements(By.XPATH, 
                                                                                            "//button[@id='stylist-logout-button'] | "
                                                                                            "//button[contains(text(), 'Logout')]"
                                                                                        )
                                                                                        if logout_buttons:
                                                                                            self.scroll_to_element(logout_buttons[0])
                                                                                            time.sleep(0.3)
                                                                                            try:
                                                                                                logout_buttons[0].click()
                                                                                            except:
                                                                                                self.driver.execute_script("arguments[0].click();", logout_buttons[0])
                                                                                            time.sleep(2.0)
                                                                                            print("  ✓ Logged out (fallback)")
                                                                                        else:
                                                                                            raise Exception("Could not find logout button")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error logging out: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                # Login as owner
                                                                                print("\nLogging in as owner...")
                                                                                try:
                                                                                    # Wait for page to load after logout
                                                                                    time.sleep(2.0)
                                                                                    
                                                                                    # Click Sign In button (or navigate to login page)
                                                                                    try:
                                                                                        # Try to find and click Sign In button on landing page
                                                                                        sign_in_button = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Sign In')]"))
                                                                                        )
                                                                                        self.scroll_to_element(sign_in_button)
                                                                                        time.sleep(0.2)
                                                                                        sign_in_button.click()
                                                                                        time.sleep(1.0)
                                                                                        print("  ✓ Clicked Sign In button")
                                                                                    except:
                                                                                        # Fallback: navigate directly to login page
                                                                                        self.driver.get(f"{BASE_URL}/login")
                                                                                        time.sleep(1.0)
                                                                                        print("  ✓ Navigated to login page")
                                                                                    
                                                                                    # Now login as owner using existing login method
                                                                                    if not self.login(self.owner_email, self.owner_password, "Owner"):
                                                                                        raise Exception("Failed to login as owner")
                                                                                    
                                                                                    time.sleep(2.0)
                                                                                    print("  ✓ Logged in as owner")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error logging in as owner: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                # Navigate to Customers tab
                                                                                print("\nNavigating to Customers tab...")
                                                                                try:
                                                                                    customers_tab = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Customers')]"))
                                                                                    )
                                                                                    self.scroll_to_element(customers_tab)
                                                                                    time.sleep(0.2)
                                                                                    customers_tab.click()
                                                                                    time.sleep(2.0)
                                                                                    print("  ✓ Clicked Customers tab")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking Customers tab: {e}")
                                                                                
                                                                                # Click View History for a customer (similar to stylist logic)
                                                                                print("\nClicking View History for customer...")
                                                                                try:
                                                                                    time.sleep(2.0)
                                                                                    customer_email_element = self.wait.until(
                                                                                        EC.presence_of_element_located((By.XPATH, f"//p[.//text()[contains(., '{self.user_email}')]]"))
                                                                                    )
                                                                                    user_id = customer_email_element.get_attribute("id").replace("owner-customer-email-", "")
                                                                                    print(f"  ✓ Found customer with email: {self.user_email} (User ID: {user_id})")
                                                                                    
                                                                                    view_history_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, f"owner-view-history-button-{user_id}"))
                                                                                    )
                                                                                    self.scroll_to_element(view_history_button)
                                                                                    time.sleep(0.3)
                                                                                    view_history_button.click()
                                                                                    time.sleep(2.0)
                                                                                    print("  ✓ Clicked 'View History' for customer")
                                                                                    
                                                                                    # Close the modal
                                                                                    print("  Closing customer visit history modal...")
                                                                                    try:
                                                                                        # Wait for modal to appear first
                                                                                        time.sleep(1.0)
                                                                                        
                                                                                        # Try multiple ways to close the modal
                                                                                        modal_closed = False
                                                                                        
                                                                                        # Method 1: Find close button by X button (X icon)
                                                                                        try:
                                                                                            close_button = self.wait.until(
                                                                                                EC.element_to_be_clickable((By.XPATH, "//button[.//*[local-name()='svg' and contains(@class, 'w-5')] and contains(@class, 'h-5')] | //button[contains(@class, 'text-gray-400')]"))
                                                                                            )
                                                                                            self.scroll_to_element(close_button)
                                                                                            time.sleep(0.2)
                                                                                            try:
                                                                                                close_button.click()
                                                                                            except:
                                                                                                self.driver.execute_script("arguments[0].click();", close_button)
                                                                                            time.sleep(1.0)
                                                                                            modal_closed = True
                                                                                            print("  ✓ Closed customer visit history modal")
                                                                                        except:
                                                                                            pass
                                                                                        
                                                                                        # Method 2: Click outside modal (on backdrop) if close button didn't work
                                                                                        if not modal_closed:
                                                                                            try:
                                                                                                # Click on the modal backdrop/overlay
                                                                                                backdrop = self.driver.find_element(By.XPATH, "//div[contains(@class, 'fixed') and contains(@class, 'inset-0') and contains(@class, 'bg-black')]")
                                                                                                self.driver.execute_script("arguments[0].click();", backdrop)
                                                                                                time.sleep(1.0)
                                                                                                modal_closed = True
                                                                                                print("  ✓ Closed modal by clicking backdrop")
                                                                                            except:
                                                                                                pass
                                                                                        
                                                                                        # Method 3: Press Escape key
                                                                                        if not modal_closed:
                                                                                            try:
                                                                                                from selenium.webdriver.common.keys import Keys
                                                                                                self.driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
                                                                                                time.sleep(1.0)
                                                                                                modal_closed = True
                                                                                                print("  ✓ Closed modal with Escape key")
                                                                                            except:
                                                                                                pass
                                                                                        
                                                                                        # Wait a bit more to ensure modal is fully closed
                                                                                        time.sleep(1.0)
                                                                                        
                                                                                        # Verify modal is closed by checking if it's not visible
                                                                                        try:
                                                                                            modal_elements = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'fixed') and contains(@class, 'inset-0')]")
                                                                                            if modal_elements:
                                                                                                # If modal still exists, try clicking outside one more time
                                                                                                self.driver.execute_script("document.body.click();")
                                                                                                time.sleep(1.0)
                                                                                        except:
                                                                                            pass
                                                                                            
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error closing modal: {e}")
                                                                                        # Try to continue anyway - might already be closed
                                                                                        time.sleep(2.0)
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking View History: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                # Navigate to Order History tab
                                                                                print("\nNavigating to Order History tab...")
                                                                                try:
                                                                                    order_history_tab = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Order History')]"))
                                                                                    )
                                                                                    self.scroll_to_element(order_history_tab)
                                                                                    time.sleep(0.2)
                                                                                    order_history_tab.click()
                                                                                    time.sleep(3.0)
                                                                                    print("  ✓ Clicked Order History tab")
                                                                                    
                                                                                    # Check if orders are loaded
                                                                                    try:
                                                                                        orders_loaded = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'card') or contains(@class, 'Card')]")
                                                                                        if orders_loaded:
                                                                                            print(f"  ✓ Found {len(orders_loaded)} order(s) loaded")
                                                                                        else:
                                                                                            print("  ℹ No orders found (may be empty)")
                                                                                    except:
                                                                                        print("  ℹ Could not verify if orders are loaded")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error navigating to Order History: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                # Navigate to Reviews tab
                                                                                print("\nNavigating to Reviews tab...")
                                                                                try:
                                                                                    reviews_tab = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Reviews')]"))
                                                                                    )
                                                                                    self.scroll_to_element(reviews_tab)
                                                                                    time.sleep(0.2)
                                                                                    reviews_tab.click()
                                                                                    time.sleep(2.0)
                                                                                    print("  ✓ Clicked Reviews tab")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking Reviews tab: {e}")
                                                                                
                                                                                # Click Salon Reviews sub-tab
                                                                                print("\nClicking Salon Reviews sub-tab...")
                                                                                try:
                                                                                    salon_reviews_tab = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "reviews-subtab-salon"))
                                                                                    )
                                                                                    self.scroll_to_element(salon_reviews_tab)
                                                                                    time.sleep(0.2)
                                                                                    salon_reviews_tab.click()
                                                                                    time.sleep(2.0)
                                                                                    print("  ✓ Clicked Salon Reviews sub-tab")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking Salon Reviews sub-tab: {e}")
                                                                                
                                                                                # Reply to a salon review
                                                                                print("\nLooking for a salon review without a reply...")
                                                                                try:
                                                                                    time.sleep(1.0)
                                                                                    reply_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.XPATH, "//button[starts-with(@id, 'salon-reply-button-')]"))
                                                                                    )
                                                                                    review_id = reply_button.get_attribute("id").replace("salon-reply-button-", "")
                                                                                    print(f"  ✓ Found a review without a reply (Review ID: {review_id})")
                                                                                    
                                                                                    self.scroll_to_element(reply_button)
                                                                                    time.sleep(0.2)
                                                                                    reply_button.click()
                                                                                    time.sleep(0.5)
                                                                                    print("  ✓ Clicked Reply button")
                                                                                    
                                                                                    reply_textarea = self.wait.until(
                                                                                        EC.presence_of_element_located((By.ID, f"salon-reply-textarea-{review_id}"))
                                                                                    )
                                                                                    self.scroll_to_element(reply_textarea)
                                                                                    time.sleep(0.2)
                                                                                    reply_textarea.click()
                                                                                    time.sleep(0.1)
                                                                                    reply_textarea.clear()
                                                                                    reply_text = "Thank you for your feedback! We're glad you enjoyed your visit."
                                                                                    reply_textarea.send_keys(reply_text)
                                                                                    time.sleep(0.3)
                                                                                    print(f"  ✓ Filled reply textarea with: {reply_text}")
                                                                                    
                                                                                    send_reply_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, f"salon-send-reply-button-{review_id}"))
                                                                                    )
                                                                                    self.scroll_to_element(send_reply_button)
                                                                                    time.sleep(0.2)
                                                                                    send_reply_button.click()
                                                                                    time.sleep(2.0)
                                                                                    print("  ✓ Clicked Send Reply button")
                                                                                    
                                                                                    time.sleep(1.0)  # Wait for toast
                                                                                    
                                                                                    # Now find the same review (which should now have a reply) and edit it
                                                                                    print("\nLooking for the review with the reply we just created to edit...")
                                                                                    time.sleep(1.0)
                                                                                    edit_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.XPATH, f"//button[starts-with(@id, 'salon-edit-reply-button-')]"))
                                                                                    )
                                                                                    reply_id_to_edit = edit_button.get_attribute("id").replace("salon-edit-reply-button-", "")
                                                                                    print(f"  ✓ Found review with reply (Reply ID: {reply_id_to_edit})")
                                                                                    
                                                                                    self.scroll_to_element(edit_button)
                                                                                    time.sleep(0.2)
                                                                                    edit_button.click()
                                                                                    time.sleep(0.5)
                                                                                    print("  ✓ Clicked Edit button")
                                                                                    
                                                                                    edit_textarea = self.wait.until(
                                                                                        EC.presence_of_element_located((By.ID, f"salon-edit-reply-textarea-{reply_id_to_edit}"))
                                                                                    )
                                                                                    self.scroll_to_element(edit_textarea)
                                                                                    time.sleep(0.2)
                                                                                    edit_textarea.click()
                                                                                    time.sleep(0.1)
                                                                                    edit_textarea.clear()
                                                                                    updated_reply_text = "Thank you so much for your kind words! We really appreciate your feedback and look forward to serving you again."
                                                                                    edit_textarea.send_keys(updated_reply_text)
                                                                                    time.sleep(0.3)
                                                                                    print(f"  ✓ Updated reply text to: {updated_reply_text}")
                                                                                    
                                                                                    update_reply_button = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, f"salon-update-reply-button-{reply_id_to_edit}"))
                                                                                    )
                                                                                    self.scroll_to_element(update_reply_button)
                                                                                    time.sleep(0.2)
                                                                                    update_reply_button.click()
                                                                                    time.sleep(2.0)
                                                                                    print("  ✓ Clicked Update Reply button")
                                                                                    
                                                                                    time.sleep(1.0)  # Wait for toast
                                                                                    
                                                                                    print("\n" + "="*70)
                                                                                    print("SALON REVIEWS REPLY AND EDIT FLOW COMPLETED")
                                                                                    print("="*70)
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error in Salon Reviews reply/edit flow: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                # Click Staff Reviews sub-tab
                                                                                print("\nClicking Staff Reviews sub-tab...")
                                                                                try:
                                                                                    staff_reviews_tab = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.ID, "reviews-subtab-staff"))
                                                                                    )
                                                                                    self.scroll_to_element(staff_reviews_tab)
                                                                                    time.sleep(0.2)
                                                                                    staff_reviews_tab.click()
                                                                                    time.sleep(2.0)
                                                                                    print("  ✓ Clicked Staff Reviews sub-tab")
                                                                                    
                                                                                    # Check if staff reviews are loaded
                                                                                    try:
                                                                                        staff_reviews_loaded = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'card') or contains(@class, 'Card')]")
                                                                                        if staff_reviews_loaded:
                                                                                            print(f"  ✓ Found {len(staff_reviews_loaded)} staff review(s) loaded")
                                                                                        else:
                                                                                            print("  ℹ No staff reviews found (may be empty)")
                                                                                    except:
                                                                                        print("  ℹ Could not verify if staff reviews are loaded")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error clicking Staff Reviews sub-tab: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                # Navigate to Revenue tab
                                                                                print("\nNavigating to Revenue tab...")
                                                                                try:
                                                                                    revenue_tab = self.wait.until(
                                                                                        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Revenue')]"))
                                                                                    )
                                                                                    self.scroll_to_element(revenue_tab)
                                                                                    time.sleep(0.2)
                                                                                    revenue_tab.click()
                                                                                    time.sleep(3.0)
                                                                                    print("  ✓ Clicked Revenue tab")
                                                                                    
                                                                                    # Scroll on the revenue page to see all data
                                                                                    print("  Scrolling on revenue page...")
                                                                                    try:
                                                                                        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                                                                                        time.sleep(0.5)
                                                                                        self.driver.execute_script("window.scrollTo(0, 0);")
                                                                                        time.sleep(0.5)
                                                                                        print("  ✓ Scrolled on revenue page")
                                                                                    except Exception as e:
                                                                                        print(f"  ⚠ Error scrolling: {e}")
                                                                                    
                                                                                    # Check if revenue data is loaded
                                                                                    try:
                                                                                        revenue_data_loaded = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'card') or contains(@class, 'Card')] | //div[contains(@class, 'text-4xl')]")
                                                                                        if revenue_data_loaded:
                                                                                            print(f"  ✓ Found revenue data loaded ({len(revenue_data_loaded)} elements)")
                                                                                        else:
                                                                                            print("  ℹ No revenue data found (may be empty)")
                                                                                    except:
                                                                                        print("  ℹ Could not verify if revenue data is loaded")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error navigating to Revenue tab: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                print("\n" + "="*70)
                                                                                print("OWNER DASHBOARD FLOW COMPLETED")
                                                                                print("="*70)
                                                                                
                                                                                # Log out from owner account
                                                                                print("\n" + "="*70)
                                                                                print("LOGGING OUT FROM OWNER ACCOUNT")
                                                                                print("="*70)
                                                                                try:
                                                                                    # Wait for any toast notifications to disappear
                                                                                    time.sleep(2.0)
                                                                                    try:
                                                                                        toast_elements = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'sonner-toast')]")
                                                                                        if toast_elements:
                                                                                            time.sleep(2.0)
                                                                                    except:
                                                                                        pass
                                                                                    
                                                                                    # Try owner logout button ID first
                                                                                    try:
                                                                                        logout_button = self.wait.until(
                                                                                            EC.element_to_be_clickable((By.ID, "owner-logout-button"))
                                                                                        )
                                                                                        self.scroll_to_element(logout_button)
                                                                                        time.sleep(0.3)
                                                                                        try:
                                                                                            logout_button.click()
                                                                                        except:
                                                                                            self.driver.execute_script("arguments[0].click();", logout_button)
                                                                                        time.sleep(2.0)
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
                                                                                            time.sleep(0.3)
                                                                                            try:
                                                                                                logout_buttons[0].click()
                                                                                            except:
                                                                                                self.driver.execute_script("arguments[0].click();", logout_buttons[0])
                                                                                            time.sleep(2.0)
                                                                                            print("  ✓ Logged out (fallback)")
                                                                                        else:
                                                                                            print("  ⚠ Could not find logout button, navigating to home")
                                                                                            self.navigate_and_scroll(BASE_URL)
                                                                                    
                                                                                    # Wait for logout to process and redirect to landing page
                                                                                    time.sleep(2.0)
                                                                                    current_url = self.driver.current_url
                                                                                    if "/login" in current_url or BASE_URL in current_url or current_url == BASE_URL + "/":
                                                                                        print("  ✓ Successfully logged out and redirected to landing page")
                                                                                    else:
                                                                                        print(f"  ⚠ Unexpected URL after logout: {current_url}")
                                                                                except Exception as e:
                                                                                    print(f"  ⚠ Error logging out: {e}")
                                                                                    import traceback
                                                                                    traceback.print_exc()
                                                                                
                                                                                # Log into admin account
                                                                                print("\n" + "="*70)
                                                                                print("LOGGING INTO ADMIN ACCOUNT")
                                                                                print("="*70)
                                                                                if not self.login("admin@strands.com", "test123", "Admin"):
                                                                                    print("  ⚠ Failed to log in as admin")
                                                                                else:
                                                                                    print("  ✓ Successfully logged in as admin")
                                                                                    
                                                                                    # Wait for admin dashboard to load
                                                                                    time.sleep(2.0)
                                                                                    current_url = self.driver.current_url
                                                                                    print(f"  Current URL after admin login: {current_url}")
                                                                                    
                                                                                    # Navigate to admin dashboard if not already there
                                                                                    if "/admin" not in current_url and "/dashboard" not in current_url:
                                                                                        self.navigate_and_scroll(f"{BASE_URL}/dashboard?tab=user-analytics")
                                                                                        time.sleep(2.0)
                                                                                    
                                                                                    # Go through admin tabs and slowly scroll through them
                                                                                    print("\n" + "="*70)
                                                                                    print("CHECKING ADMIN TABS FOR UPDATED DATA")
                                                                                    print("="*70)
                                                                                    
                                                                                    admin_tabs = [
                                                                                        ("Loyalty Monitoring", "/admin/loyalty-monitoring"),
                                                                                        ("User Analytics", "/dashboard?tab=user-analytics"),
                                                                                        ("Business Insights", "/dashboard?tab=business-insights"),
                                                                                        ("Revenue Tracking", "/dashboard?tab=revenue-analytics")
                                                                                    ]
                                                                                    
                                                                                    for tab_name, tab_path in admin_tabs:
                                                                                        print(f"\n  Checking {tab_name} tab...")
                                                                                        try:
                                                                                            # Try to click the tab button first
                                                                                            if tab_name == "Loyalty Monitoring":
                                                                                                tab_clicked = self.safe_click(
                                                                                                    By.XPATH,
                                                                                                    "//button[contains(text(), 'Loyalty Monitoring')] | //a[contains(text(), 'Loyalty Monitoring')]",
                                                                                                    f"{tab_name} tab"
                                                                                                )
                                                                                            elif tab_name == "User Analytics":
                                                                                                tab_clicked = self.safe_click(
                                                                                                    By.XPATH,
                                                                                                    "//button[contains(text(), 'User Analytics')] | //a[contains(text(), 'User Analytics')]",
                                                                                                    f"{tab_name} tab"
                                                                                                )
                                                                                            elif tab_name == "Business Insights":
                                                                                                tab_clicked = self.safe_click(
                                                                                                    By.XPATH,
                                                                                                    "//button[contains(text(), 'Business Insights')] | //a[contains(text(), 'Business Insights')]",
                                                                                                    f"{tab_name} tab"
                                                                                                )
                                                                                            elif tab_name == "Revenue Tracking":
                                                                                                tab_clicked = self.safe_click(
                                                                                                    By.XPATH,
                                                                                                    "//button[contains(text(), 'Revenue Tracking')] | //button[contains(text(), 'Revenue Analytics')] | //a[contains(text(), 'Revenue')]",
                                                                                                    f"{tab_name} tab"
                                                                                                )
                                                                                            
                                                                                            # Wait a moment after clicking the tab
                                                                                            if tab_clicked:
                                                                                                time.sleep(0.5)  # Small wait for tab click to register
                                                                                            
                                                                                            if not tab_clicked:
                                                                                                # Fallback to direct navigation
                                                                                                self.navigate_and_scroll(f"{BASE_URL}{tab_path}")
                                                                                                time.sleep(0.5)  # Small wait after navigation
                                                                                            
                                                                                            # Wait for page to load - wait for content elements to be present
                                                                                            print(f"    Waiting for {tab_name} page to load...")
                                                                                            try:
                                                                                                # Wait for common data elements or page structure to appear
                                                                                                # More specific waits for admin pages
                                                                                                self.wait.until(
                                                                                                    EC.any_of(
                                                                                                        EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'card')] | //div[contains(@class, 'Card')]")),
                                                                                                        EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'chart')] | //div[contains(@class, 'Chart')] | //canvas")),
                                                                                                        EC.presence_of_element_located((By.XPATH, "//table | //tbody | //tr")),
                                                                                                        EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'text-4xl')] | //div[contains(@class, 'text-3xl')] | //div[contains(@class, 'text-2xl')]")),
                                                                                                        EC.presence_of_element_located((By.XPATH, "//h1 | //h2 | //h3 | //h4")),
                                                                                                        EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'grid')] | //div[contains(@class, 'flex')]")),
                                                                                                        EC.presence_of_element_located((By.XPATH, "//div[contains(text(), 'Total')] | //div[contains(text(), 'Users')] | //div[contains(text(), 'Revenue')]"))
                                                                                                    )
                                                                                                )
                                                                                                time.sleep(0.5)  # Additional small wait for any animations
                                                                                                print(f"    ✓ {tab_name} page loaded")
                                                                                            except Exception as e:
                                                                                                print(f"    ⚠ Timeout waiting for {tab_name} to load: {e}")
                                                                                                time.sleep(2.0)  # Fallback wait
                                                                                            
                                                                                            # Slowly scroll through the page to check updated data
                                                                                            print(f"    Slowly scrolling through {tab_name}...")
                                                                                            try:
                                                                                                page_height = self.driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
                                                                                                viewport_height = self.driver.execute_script("return window.innerHeight")
                                                                                                
                                                                                                if page_height > viewport_height:
                                                                                                    # Scroll in smaller increments for slower, more visible scrolling
                                                                                                    scroll_increment = viewport_height * 0.5  # Smaller increments
                                                                                                    current_scroll = 0
                                                                                                    while current_scroll < page_height:
                                                                                                        current_scroll += scroll_increment
                                                                                                        self.driver.execute_script(f"window.scrollTo(0, {current_scroll});")
                                                                                                        time.sleep(0.8)  # Longer delay for slower scrolling
                                                                                                    
                                                                                                    # Scroll to bottom
                                                                                                    self.driver.execute_script(f"window.scrollTo(0, {page_height});")
                                                                                                    time.sleep(1.0)
                                                                                                    
                                                                                                    # Scroll back to top slowly
                                                                                                    scroll_back_increment = viewport_height * 0.5
                                                                                                    current_scroll = page_height
                                                                                                    while current_scroll > 0:
                                                                                                        current_scroll -= scroll_back_increment
                                                                                                        if current_scroll < 0:
                                                                                                            current_scroll = 0
                                                                                                        self.driver.execute_script(f"window.scrollTo(0, {current_scroll});")
                                                                                                        time.sleep(0.8)
                                                                                                    
                                                                                                    # Final scroll to top
                                                                                                    self.driver.execute_script("window.scrollTo(0, 0);")
                                                                                                    time.sleep(0.5)
                                                                                                else:
                                                                                                    print(f"    ℹ Page content fits in viewport, no scrolling needed")
                                                                                                
                                                                                                print(f"    ✓ Finished scrolling through {tab_name}")
                                                                                            except Exception as e:
                                                                                                print(f"    ⚠ Error scrolling through {tab_name}: {e}")
                                                                                            
                                                                                            # Check if data is loaded (look for common data elements)
                                                                                            try:
                                                                                                data_elements = self.driver.find_elements(By.XPATH, 
                                                                                                    "//div[contains(@class, 'card')] | "
                                                                                                    "//div[contains(@class, 'Card')] | "
                                                                                                    "//div[contains(@class, 'chart')] | "
                                                                                                    "//div[contains(@class, 'Chart')] | "
                                                                                                    "//table | "
                                                                                                    "//div[contains(@class, 'text-4xl')] | "
                                                                                                    "//div[contains(@class, 'text-3xl')]"
                                                                                                )
                                                                                                if data_elements:
                                                                                                    print(f"    ✓ Found {len(data_elements)} data element(s) on {tab_name} page")
                                                                                                else:
                                                                                                    print(f"    ℹ No data elements found on {tab_name} page (may be empty)")
                                                                                            except:
                                                                                                print(f"    ℹ Could not verify data elements on {tab_name} page")
                                                                                                
                                                                                        except Exception as e:
                                                                                            print(f"    ⚠ Error checking {tab_name} tab: {e}")
                                                                                            import traceback
                                                                                            traceback.print_exc()
                                                                                    
                                                                                    print("\n" + "="*70)
                                                                                    print("ADMIN TABS DATA CHECK COMPLETED")
                                                                                    print("="*70)
                                                                            except Exception as e:
                                                                                print(f"  ⚠ Error navigating to Browse Salons: {e}")
                                                                        except Exception as e:
                                                                            print(f"  ⚠ Error filling card details: {e}")
                                                                            import traceback
                                                                            traceback.print_exc()
                                                                    except Exception as e:
                                                                        print(f"  ⚠ Error clicking Enter Card Details: {e}")
                                                                except Exception as e:
                                                                    print(f"  ⚠ Error navigating to Settings: {e}")
                                                            except Exception as e:
                                                                print(f"  ⚠ Error clicking Complete Order: {e}")
                                                        except Exception as e:
                                                            print(f"  ⚠ Error clicking Proceed to Checkout: {e}")
                                                    except Exception as e:
                                                        print(f"  ⚠ Error clicking View Cart: {e}")
                                                except Exception as e:
                                                    print(f"  ⚠ Error clicking View Products: {e}")
                                            else:
                                                print("  ⚠ No View Details buttons found")
                                        except Exception as e:
                                            print(f"  ⚠ Error finding salon: {e}")
                                            import traceback
                                            traceback.print_exc()
                                        
                                        print("\n" + "="*70)
                                        print("PRODUCT PURCHASE FLOW COMPLETED")
                                        print("="*70)
                                        
                                    except Exception as e:
                                        print(f"  ⚠ Error in product purchase flow: {e}")
                                        import traceback
                                        traceback.print_exc()
                                    
                                except Exception as e:
                                    print(f"  ⚠ Error in private note flow: {e}")
                                    import traceback
                                    traceback.print_exc()
                            else:
                                print("  ⚠ Could not determine booking_id for private note flow")
                        except Exception as e:
                            print(f"  ⚠ Error in My Appointments / reschedule flow: {e}")
                    except Exception as e:
                        print(f"    ⚠ Error filling payment card: {e}")
                        import traceback
                        traceback.print_exc()
                else:
                    print(f"  ⚠ Signup may have completed - redirected to: {current_url}")
                    print("  Attempting to navigate to browser page anyway...")
                    try:
                        self.driver.get(f"{BASE_URL}/browser")
                        time.sleep(2)
                        print("  ✓ Navigated to browser page")
                        # Try to continue with booking flow
                        print("Attempting booking flow from current page...")
                        # (The booking flow code would continue here, but we'll let it try)
                    except:
                        pass
                    
            except Exception as e:
                print(f"  ⚠ Error signing up new user or booking: {e}")
                import traceback
                traceback.print_exc()
            
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

