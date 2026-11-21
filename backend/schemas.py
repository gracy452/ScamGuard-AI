
from pydantic import BaseModel, Field


class JobRequest(BaseModel):

    title: str = ""
    location: str = ""
    department: str = ""
    salary_range: str = ""

    company_profile: str = ""
    description: str = ""
    requirements: str = ""
    benefits: str = ""

    telecommuting: str = "f"
    has_company_logo: str = "f"
    has_questions: str = "f"

    employment_type: str = ""
    required_experience: str = ""
    required_education: str = ""

    industry: str = ""
    function: str = ""
