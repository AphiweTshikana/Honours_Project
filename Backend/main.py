import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import jwt

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

app = FastAPI(title="Academic Tracking System API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://honours-project.vercel.app"
],
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/teacher/login")

# --- UTILITY & SECURITY FUNCTIONS ---

def hash_pin(pin: str) -> str:
    """Hashes a PIN or password string using SHA-256."""
    return hashlib.sha256(str(pin).strip().encode('utf-8')).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a signed JWT token containing user identity, role, and profile claims."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_class_folder(class_name: str) -> str:
    """Dynamically resolves the path to the folder containing class spreadsheets."""
    parts = class_name.strip().split()
    if len(parts) == 2 and parts[0] == "Grade":
        grade_num = "".join(filter(str.isdigit, parts[1]))
        grade_dir = f"Grade {grade_num}"
    else:
        grade_dir = class_name
    return os.path.join(DATA_DIR, grade_dir, class_name)

def get_performance_status(mark: float):
    """Performance classification logic returning 'On Track' for marks >= 50."""
    if mark >= 50:
        return "On Track", "GREEN"
    if mark >= 40:
        return "Needs Review", "YELLOW"
    return "At Risk", "RED"

# --- AUTHENTICATION & ACCESS CONTROL DEPENDENCIES ---

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Decodes and validates incoming Bearer JWT tokens."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        
        if user_id is None or role is None:
            raise credentials_exception
            
        return {
            "user_id": user_id, 
            "role": role, 
            "name": payload.get("name"),
            "profile_type": payload.get("profile_type"),
            "assignments": payload.get("assignments", [])
        }
    except jwt.PyJWTError:
        raise credentials_exception

class RoleChecker:
    """Dependency factory enforcing allowed roles on routes."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient permissions for this action"
            )
        return current_user

def verify_class_assignment(user: dict, grade_class: str, subject: str):
    """Enforces Resource-Scoped / Attribute-Based Access Control (ABAC)."""
    if user["role"] == "Admin":
        return  # Admins have global access
    
    assigned = user.get("assignments", [])
    has_access = any(
        a.get("class_name", "").strip().lower() == grade_class.strip().lower() and
        a.get("subject", "").strip().lower() == subject.strip().lower()
        for a in assigned
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You are not assigned to manage {grade_class} ({subject})."
        )

# --- REQUEST / RESPONSE MODELS ---

class StudentParentLoginRequest(BaseModel):
    grade_class: str
    subject: str
    name: str
    pin: str
    profile_type: Optional[str] = "Student"

class TeacherLoginRequest(BaseModel):
    teacher_id: str
    password: str

class UpdateMarksRequest(BaseModel):
    grade_class: str
    subject: str
    students: List[Dict[str, Any]]

# --- ENDPOINTS ---

@app.post("/api/student/login")
def student_parent_login(req: StudentParentLoginRequest):
    """Authenticates student/parent credentials and generates a server-validated JWT token."""
    normalized_profile = req.profile_type.capitalize() if req.profile_type else "Student"
    if normalized_profile not in ["Student", "Parent"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid profile_type specified. Must be 'Student' or 'Parent'."
        )

    class_folder = get_class_folder(req.grade_class)
    file_path = os.path.join(class_folder, f"{req.subject}.xlsx")

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, 
            detail=f"Subject record '{req.subject}' not found for {req.grade_class}."
        )

    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read dataset: {str(e)}")

    match = df[df['name'].astype(str).str.strip().str.lower() == req.name.strip().lower()]
    if match.empty:
        raise HTTPException(status_code=401, detail="Student name not found in class records.")

    student_row = match.iloc[0].to_dict()
    stored_pin = str(student_row.get('pin', '')).strip()
    provided_pin_hash = hash_pin(req.pin)
    
    if stored_pin != provided_pin_hash and stored_pin != str(req.pin).strip():
        raise HTTPException(status_code=401, detail="Invalid PIN.")

    assessment_columns = [col for col in df.columns if col not in ['name', 'pin'] and not col.endswith('_Weight')]
    class_assessment_has_marks = {}
    for col in assessment_columns:
        col_values = df[col].dropna()
        if col_values.empty:
            class_assessment_has_marks[col] = False
        else:
            numeric_values = pd.to_numeric(col_values, errors='coerce').dropna()
            if len(numeric_values) == len(col_values):
                class_assessment_has_marks[col] = bool(numeric_values.ne(0).any())
            else:
                class_assessment_has_marks[col] = True

    assessments = []
    accumulated_score = 0.0
    accumulated_weight = 0.0

    for col in assessment_columns:
        weight_col = f"{col}_Weight"
        raw_val = student_row.get(col, None)
        raw_weight = student_row.get(weight_col, 0) if weight_col in student_row else 0.0

        val = None if pd.isna(raw_val) else float(raw_val)
        weight = 0.0 if pd.isna(raw_weight) else float(raw_weight)

        if val == 0.0 and not class_assessment_has_marks.get(col, False):
            val = None
        
        assessments.append({
            "name": col,
            "score": val,
            "weight": weight,
            "class_has_mark": class_assessment_has_marks.get(col, False)
        })
        
        if class_assessment_has_marks.get(col, False):
            score_to_use = float(val) if val is not None else 0.0
            accumulated_score += (score_to_use * weight)
            accumulated_weight += weight
        elif val is not None:
            accumulated_score += (val * weight)
            accumulated_weight += weight

    current_pct = round((accumulated_score / accumulated_weight), 1) if accumulated_weight > 0 else 0
    term_status, status_code = get_performance_status(current_pct)

    remaining_weight = sum(a['weight'] for a in assessments if a['score'] is None and a['weight'] > 0)
    required_remaining_mark = None
    if remaining_weight > 0:
        needed_points = 50.0 - accumulated_score
        required_remaining_mark = round(max(min((needed_points / remaining_weight), 100.0), 0.0), 1)

    access_token = create_access_token(
        data={
            "sub": req.name, 
            "role": normalized_profile, 
            "profile_type": normalized_profile
        }
    )

    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "name": student_row['name'],
        "grade_class": req.grade_class,
        "subject": req.subject,
        "profile_type": normalized_profile,
        "assessments": assessments,
        "current_percentage": round(current_pct, 1),
        "term_status": term_status,
        "status_code": status_code,
        "required_remaining_mark": required_remaining_mark
    }

@app.post("/api/teacher/login")
def teacher_login(req: TeacherLoginRequest):
    """Authenticates teacher and embeds assigned class scopes into the JWT token."""
    teachers_file = os.path.join(DATA_DIR, "teachers.xlsx")
    if not os.path.exists(teachers_file):
        raise HTTPException(status_code=500, detail="Teacher credentials database missing.")

    df = pd.read_excel(teachers_file)
    match = df[df['teacher_id'].astype(str).str.strip() == req.teacher_id.strip()]

    if match.empty:
        raise HTTPException(status_code=401, detail="Invalid Teacher ID")

    row = match.iloc[0]
    stored_hash = str(row.get('password_hash', '')).strip()
    
    if stored_hash != hash_pin(req.password) and str(row.get('password', '')).strip() != req.password:
        raise HTTPException(status_code=401, detail="Invalid Password")

    raw_assignments = str(row['class_assignments']).split(',')
    assignments = []
    for item in raw_assignments:
        if ":" in item:
            c, s = item.split(":")
            assignments.append({"class_name": c.strip(), "subject": s.strip()})

    access_token = create_access_token(
        data={
            "sub": str(row['teacher_id']),
            "role": "Teacher",
            "name": row['name'],
            "profile_type": "Teacher",
            "assignments": assignments
        }
    )

    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "name": row['name'],
        "assignments": assignments
    }

@app.get(
    "/api/teacher/class-data",
    dependencies=[Depends(RoleChecker(["Teacher", "Admin"]))]
)
def get_class_data(
    grade_class: str, 
    subject: str, 
    user: dict = Depends(get_current_user)
):
    """Resource-Scoped Endpoint: Validates teacher class assignment before reading records."""
    verify_class_assignment(user, grade_class, subject)

    class_folder = get_class_folder(grade_class)
    file_path = os.path.join(class_folder, f"{subject}.xlsx")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Requested class spreadsheet not found.")

    df = pd.read_excel(file_path)
    df = df.astype(object).where(pd.notnull(df), None)
    records = df.drop(columns=['pin'], errors='ignore').to_dict(orient='records')

    return {"status": "success", "students": records}

@app.post(
    "/api/teacher/update-marks",
    dependencies=[Depends(RoleChecker(["Teacher", "Admin"]))]
)
def update_marks(
    req: UpdateMarksRequest, 
    user: dict = Depends(get_current_user)
):
    """Resource-Scoped Endpoint: Validates teacher class assignment before writing marks."""
    verify_class_assignment(user, req.grade_class, req.subject)

    class_folder = get_class_folder(req.grade_class)
    file_path = os.path.join(class_folder, f"{req.subject}.xlsx")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Target spreadsheet not found.")

    try:
        existing_df = pd.read_excel(file_path)
        incoming_df = pd.DataFrame(req.students)

        if 'name' not in incoming_df.columns:
            raise HTTPException(status_code=400, detail="Payload missing required 'name' field.")

        for _, row in incoming_df.iterrows():
            student_name = str(row['name']).strip().lower()
            mask = existing_df['name'].astype(str).str.strip().str.lower() == student_name
            
            if mask.any():
                for col in incoming_df.columns:
                    if col in existing_df.columns and col != 'pin':
                        existing_df.loc[mask, col] = row[col]

        existing_df.to_excel(file_path, index=False)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update spreadsheet: {str(e)}")

    return {
        "status": "success", 
        "message": f"Successfully updated records for {req.grade_class} ({req.subject})."
    }
