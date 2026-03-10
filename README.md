## GatorGoods Dev Setup

This project is a React frontend (Create React App) with an Express + MongoDB backend.

### 1. Install dependencies

From the repository root:

```bash
npm install
cd backend
npm install
```

### 2. Environment variables

The backend expects a MongoDB connection string in `backend/.env`:

```bash
mongo_url=your-mongodb-connection-string
```

An example file is provided at `backend/.env.example`. **Do not commit your real `.env` file.**

### 3. Scripts

From the repository root:

- **Frontend only**

  ```bash
  npm start
  ```

  Runs the React app at `http://localhost:3000`.

- **Backend only**

  ```bash
  cd backend
  npm run dev
  ```

  Runs the Express API with `nodemon` at `http://localhost:5000`.

- **Frontend + backend together**

  ```bash
  npm run serverStart
  ```

  Uses `npm-run-all` to start both the frontend (`frontStart`) and backend (`backStart`) in parallel.

