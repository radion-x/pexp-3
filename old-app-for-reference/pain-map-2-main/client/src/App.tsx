import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WizardProvider } from './WizardState';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import DoctorRoutes from './routing/DoctorRoutes';
import WizardAssessment from './components/WizardAssessment';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <WizardProvider>
                  <WizardAssessment />
                </WizardProvider>
              }
            />
            <Route path="/doctors/*" element={<DoctorRoutes />} />
          </Routes>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
