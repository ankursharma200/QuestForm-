    import React from 'react'
    import ReactDOM from 'react-dom/client'
    import { createBrowserRouter, RouterProvider } from 'react-router-dom';
    import App from './App.jsx'
    import FormEditor from './components/FormEditor.jsx';
    import FormFiller from './components/FormFiller.jsx';
    import './index.css'

 const router = createBrowserRouter([
      {
        path: "/",
        element: <App />,
        children: [
            {
                index: true, 
                element: <FormEditor />
            },
            {
                path: "edit/:formId", 
                element: <FormEditor />
            },
            {
               path: "fill/:formId", 
                element: <FormFiller />
            }
        ]
      },
    ]);

    
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <RouterProvider router={router} />
      </React.StrictMode>,
    )