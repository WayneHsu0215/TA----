import React from 'react'
import ReactDOM from 'react-dom/client'
import {
    createBrowserRouter,
    RouterProvider,
} from "react-router-dom";
import Root from './routes/root';
import Test from './routes/test';
import './index.css'
import { ToastContainer } from 'react-toastify';

const router = createBrowserRouter([
    { path: "/", element: <Root /> },
    { path: "/test", element: <Test /> },

]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <ToastContainer />
      <RouterProvider router={router} />
  </React.StrictMode>,
)
