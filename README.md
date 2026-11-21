\# NETRA – Investigation \& Intelligence Platform



NETRA is a full-stack investigation and intelligence analysis platform designed to assist investigators in managing cases, analyzing evidence, extracting entities, identifying connections, and visualizing relationships between individuals, organizations, locations, and other relevant information.



\## Features



\- Case management and investigation tracking

\- Evidence management and integrity verification

\- Entity extraction from investigation documents

\- Relationship and network visualization

\- Investigation analytics and insights

\- Alert and suspicious pattern detection

\- Authentication and role-based access control

\- Audit logging

\- Interactive investigation dashboard



\## Technology Stack



\### Backend

\- Python

\- FastAPI

\- SQLite

\- JWT Authentication



\### Frontend

\- React

\- JavaScript

\- Vite

\- HTML

\- CSS



\## Project Structure



```text

NETRA/

├── backend/

│   ├── main.py

│   ├── auth.py

│   ├── database.py

│   ├── extraction.py

│   ├── integrity.py

│   ├── patterns.py

│   ├── permissions.py

│   ├── validators.py

│   └── requirements.txt

│

├── frontend/

│   ├── public/

│   ├── src/

│   ├── package.json

│   └── package-lock.json

│

├── .gitignore

└── README.md

```



\## Installation and Setup



\### Prerequisites



\- Python 3.10+

\- Node.js and npm



\### Backend Setup



Navigate to the backend directory:



```bash

cd backend

```



Create a virtual environment:



```bash

python -m venv venv

```



Activate it on Windows:



```bash

venv\\Scripts\\activate

```



Install dependencies:



```bash

pip install -r requirements.txt

```



Start the backend server:



```bash

uvicorn main:app --reload

```



Backend API:



```text

http://127.0.0.1:8000

```



API documentation:



```text

http://127.0.0.1:8000/docs

```



\### Frontend Setup



Open another terminal and navigate to the frontend directory:



```bash

cd frontend

```



Install dependencies:



```bash

npm install

```



Start the development server:



```bash

npm run dev

```



Open the frontend URL provided by Vite in your browser.



\## Security



NETRA incorporates authentication, authorization, evidence integrity verification, input validation, and audit logging.



Sensitive information, environment variables, databases, local dependencies, and user-uploaded files should not be committed to the repository.



\## Disclaimer



NETRA is an educational and development project intended for demonstration and research purposes. It should not be used with real sensitive investigative information without appropriate security testing, privacy safeguards, and authorization.



\## Author



Developed as a cybersecurity and investigation technology project.



