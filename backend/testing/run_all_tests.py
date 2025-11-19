#!/usr/bin/env python3
"""
Comprehensive Test Suite for SafeBank
Runs all tests in sequence and provides a summary
"""

import subprocess
import sys
import os

def print_header(title):
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70 + "\n")

def run_test(script_name, description):
    """Run a test script and return success status"""
    print_header(description)
    try:
        result = subprocess.run(
            [sys.executable, script_name],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=False,
            text=True
        )
        return result.returncode == 0
    except Exception as e:
        print(f"Error running {script_name}: {e}")
        return False

def main():
    print_header("SafeBank Comprehensive Test Suite")
    print("This will run all test scripts in sequence.")
    print("Make sure services are running: cd backend && docker-compose up")
    
    input("\nPress Enter to start tests...")
    
    tests = [
        ("test_jwt_security.py", "JWT Security Tests (RS256 Verification)"),
        ("test_auth_service.py", "Auth Service Tests (Registration & Login)"),
        ("test_accounts_service.py", "Accounts Service Tests (Banking Operations)"),
        ("test_admin_service.py", "Admin Service Tests (User Management)")
    ]
    
    results = {}
    
    for script, description in tests:
        if not os.path.exists(script):
            print(f"⚠️  Test file not found: {script}")
            results[description] = False
            continue
        
        success = run_test(script, description)
        results[description] = success
        
        if success:
            print(f"\n✅ {description} - PASSED")
        else:
            print(f"\n❌ {description} - FAILED")
        
        print("\n" + "-"*70)
        input("Press Enter to continue to next test...")
    
    # Final Summary
    print_header("Test Suite Summary")
    
    passed = sum(results.values())
    total = len(results)
    
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%\n")
    
    for test, success in results.items():
        symbol = "✅" if success else "❌"
        print(f"{symbol} {test}")
    
    print("\n" + "="*70)
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! SafeBank is working correctly.")
    else:
        print("⚠️  Some tests failed. Review the output above.")
    
    print("="*70)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest suite interrupted by user.")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
