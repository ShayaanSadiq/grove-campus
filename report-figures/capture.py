import json
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = Path(__file__).resolve().parent


def api(path):
    with urllib.request.urlopen(BASE + path) as response:
        return json.load(response)


def main():
    services = api("/api/services?q=Group%20Study%20Room%20A").get("services", [])
    study = next(item for item in services if item["name"] == "Group Study Room A")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.set_default_timeout(20000)

        def save(name, full_page=True):
            page.screenshot(path=str(OUT / f"{name}.png"), full_page=full_page)
            print("saved", name)

        page.goto(BASE, wait_until="networkidle")
        page.get_by_text("14", exact=True).first.wait_for()
        save("fig-6-1-home")

        page.goto(f"{BASE}/services?category=Transport", wait_until="networkidle")
        page.get_by_role("link", name="City Shuttle Seat").wait_for()
        save("fig-17-2-catalog")

        page.goto(f"{BASE}/services/{study['id']}", wait_until="networkidle")
        page.get_by_role("button", name="Sign in to reserve").wait_for()
        save("fig-6-2-reserve")

        page.goto(f"{BASE}/design", wait_until="networkidle")
        cards = page.locator(".wire-screen")
        cards.first.wait_for()
        for index, name in enumerate(
            ["fig-5-1-wire-catalog", "fig-5-2-wire-reserve", "fig-5-3-wire-bookings", "fig-5-4-wire-admin"]
        ):
            cards.nth(index).screenshot(path=str(OUT / f"{name}.png"))
            print("saved", name)

        page.goto(f"{BASE}/login", wait_until="networkidle")
        page.locator("input[type=email]").fill("ananya@grove.edu")
        page.locator("input[type=password]").fill("Student@123")
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url("**/bookings")
        page.get_by_role("link", name="Group Study Room A").first.wait_for()

        page.get_by_role("link", name="Group Study Room A").first.click()
        page.get_by_role("heading", name="Pay ₹150").wait_for()
        save("fig-11-1-payment")

        page.goto(f"{BASE}/bookings", wait_until="networkidle")
        page.get_by_text("City Shuttle Seat").first.wait_for()
        page.get_by_text("City Shuttle Seat").first.click()
        page.get_by_role("heading", name="Receipt").wait_for()
        save("fig-11-2-receipt")

        page.goto(f"{BASE}/bookings", wait_until="networkidle")
        page.get_by_role("button", name="Completed").click()
        page.get_by_text("Mock Interview").first.wait_for()
        page.get_by_text("Mock Interview").first.click()
        page.get_by_role("heading", name="How did it go?").wait_for()
        save("fig-17-5-status")

        page.get_by_role("button", name="Log out").click()
        page.goto(f"{BASE}/login", wait_until="networkidle")
        page.locator("input[type=email]").fill("admin@grove.edu")
        page.locator("input[type=password]").fill("Admin@123")
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url("**/admin")
        page.get_by_text("Campus overview").wait_for()
        save("fig-14-1-admin")

        page.goto(f"{BASE}/admin/services", wait_until="networkidle")
        page.get_by_role("button", name="Add service").wait_for()
        save("fig-14-2-services")

        page.goto(f"{BASE}/admin/users", wait_until="networkidle")
        page.get_by_text("Sara Iqbal").wait_for()
        save("fig-17-8-users")

        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(f"{BASE}/services", wait_until="networkidle")
        page.get_by_role("button", name="Menu").click()
        page.get_by_role("link", name="Services").first.wait_for()
        save("fig-17-9-mobile", full_page=False)

        browser.close()


if __name__ == "__main__":
    main()
