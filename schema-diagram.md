erDiagram
USER {
string name
string email PK
string password
enum role
boolean isActive
date lastLogout
}
EMPLOYEE {
ObjectId userId FK
string employeeCode
ObjectId department FK
ObjectId designation FK
ObjectId manager FK
number salary
date joiningDate
string phone
}
FREELANCER {
ObjectId userId FK
number hourlyRate
string[] skills
string portfolioUrl
}
DEPARTMENT {
string code
string name PK
ObjectId head FK
ObjectId parentDepartment FK
}
ROLE {
string title
string level
}
PROJECT {
string code
string name
ObjectId manager FK
ObjectId department FK
ObjectId ownerManager FK
Employee[] employees
Freelancer[] freelancers
}
TASK {
string title
ObjectId project FK
ObjectId assignee FK
ObjectId createdBy FK
enum status
enum priority
date deadline
}
ATTENDANCE {
ObjectId employee FK
date date PK
date clockIn
date clockOut
enum status
}
LEAVE {
ObjectId employee FK
enum type
date from
date to
enum status
}
PAYROLL {
ObjectId employee FK
string month PK
enum status
number grossSalary
number netSalary
}
TIMESHEET {
ObjectId freelancer FK
ObjectId project FK
number hours
date date PK
enum status
}
PERFORMANCE {
ObjectId user FK
ObjectId reviewer FK
number rating
string period PK
}
DOCUMENT {
ObjectId owner FK
string filename
string url
}
INVOICE {
ObjectId freelancer FK
ObjectId project FK
number amount
enum status
}

    USER ||--o{ EMPLOYEE : "has"
    USER ||--o{ FREELANCER : "has"
    USER ||--|| DEPARTMENT : "heads"
    DEPARTMENT ||--o{ EMPLOYEE : "has"
    ROLE ||--o{ EMPLOYEE : "designation"
    USER ||--o{ EMPLOYEE : "manager"
    USER ||--o{ PROJECT : "manager"
    USER ||--o{ PROJECT : "ownerManager"
    DEPARTMENT ||--o{ PROJECT : ""
    EMPLOYEE ||--o{ PROJECT : "assigned"
    FREELANCER ||--o{ PROJECT : "assigned"
    PROJECT ||--o{ TASK : "has"
    USER ||--o{ TASK : "assignee"
    USER ||--o{ TASK : "createdBy"
    EMPLOYEE ||--o{ ATTENDANCE : "has"
    EMPLOYEE ||--o{ LEAVE : "applied"
    EMPLOYEE ||--o{ PAYROLL : "has"
    USER ||--o{ PERFORMANCE : "reviewed"
    USER ||--o{ PERFORMANCE : "reviewer"
    USER ||--o{ DOCUMENT : "owns"
    FREELANCER ||--o{ TIMESHEET : "submitted"
    PROJECT ||--o{ TIMESHEET : "for"
    FREELANCER ||--o{ INVOICE : "issued"
    PROJECT ||--o{ INVOICE : "for"

```

# Workflow360 Database Schema Diagram

This Mermaid ER diagram represents the MongoDB schema of the Workflow360 project.

## Key Entities:
- **User**: Base model with roles (ADMIN, EMPLOYEE, FREELANCER, MANAGER)
- **Employee/Freelancer**: Extend User
- **HR/Attendance**: Attendance, Leave, Payroll (Employee-centric)
- **Projects/Tasks**: Project -> Tasks, with assignees
- **Freelancer-specific**: Timesheet, Invoice
- **Performance Reviews**: Between Users

## Usage:
- Open this file in VSCode (install Mermaid preview extension if needed).
- Or copy the Mermaid code to [mermaid.live](https://mermaid.live) for interactive diagram.
- Relationships shown via FK refs (||--o{ one-to-many, etc.).

## Notes:
- PKs implied (e.g., _id, unique composites like Attendance.date+employee).
- All models have timestamps:true.
- Enums simplified for diagram.

Full schemas in `backend/models/*.js`.
```
