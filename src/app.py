"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
from pathlib import Path
import json
import hashlib
import secrets
from starlette.middleware.sessions import SessionMiddleware

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key="super-secret-key-change-in-production")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# User persistence
users_file = os.path.join(current_dir, "users.json")

def load_users():
    if os.path.exists(users_file):
        with open(users_file) as f:
            return json.load(f)
    return {}

def save_users(users):
    with open(users_file, 'w') as f:
        json.dump(users, f, indent=2)

# Load users on startup
users = load_users()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed):
    return hash_password(password) == hashed


@app.post("/register")
def register(
    name: str = Form(...),
    sap_id: str = Form(...),
    password: str = Form(...),
    reg_number: str = Form(...),
    branch: str = Form(...),
    year: str = Form(...),
    gender: str = Form(...)
):
    """Register a new user"""
    if sap_id in users:
        raise HTTPException(status_code=400, detail="SAP ID already registered")
    
    # Validate password strength (at least 8 chars, one number, one special)
    if len(password) < 8 or not any(c.isdigit() for c in password) or not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters with at least one number and one special character")
    
    users[sap_id] = {
        "name": name,
        "sap_id": sap_id,
        "password_hash": hash_password(password),
        "reg_number": reg_number,
        "branch": branch,
        "year": year,
        "gender": gender
    }
    save_users(users)
    return {"message": "Registration successful"}


@app.post("/login")
def login(request: Request, sap_id: str = Form(...), password: str = Form(...)):
    """Login a user"""
    if sap_id not in users or not verify_password(password, users[sap_id]["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    request.session["user"] = sap_id
    return {"message": "Login successful"}


@app.post("/logout")
def logout(request: Request):
    """Logout a user"""
    request.session.pop("user", None)
    return {"message": "Logout successful"}


@app.get("/current_user")
def current_user(request: Request):
    """Get current logged in user"""
    user_id = request.session.get("user")
    if not user_id:
        return None
    return users.get(user_id)


@app.post("/forgot_password")
def forgot_password(sap_id: str = Form(...)):
    """Forgot password - placeholder"""
    if sap_id not in users:
        raise HTTPException(status_code=404, detail="SAP ID not found")
    # In real app, send email
    return {"message": "Password reset instructions sent (placeholder)"}

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, request: Request):
    """Sign up a student for an activity"""
    user_id = request.session.get("user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Check if already signed up
    if user_id in activity["participants"]:
        raise HTTPException(status_code=400, detail="Already signed up")

    # Check max participants
    if len(activity["participants"]) >= activity["max_participants"]:
        raise HTTPException(status_code=400, detail="Activity is full")

    # Add student
    activity["participants"].append(user_id)
    return {"message": f"Signed up {users[user_id]['name']} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, request: Request):
    """Unregister a student from an activity"""
    user_id = request.session.get("user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if user_id not in activity["participants"]:
        raise HTTPException(status_code=400, detail="Not signed up for this activity")

    # Remove student
    activity["participants"].remove(user_id)
    return {"message": f"Unregistered {users[user_id]['name']} from {activity_name}"}
