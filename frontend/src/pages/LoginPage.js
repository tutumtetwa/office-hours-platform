import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Card, Alert } from '../components/UI';
import { authAPI } from '../utils/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for success message from registration
  const successMessage = location.state?.message;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData.email, formData.password);
      const { token, user } = response.data;
      
      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'instructor') {
        navigate('/instructor/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to Office Hours Platform
          </p>
        </div>

        {successMessage && <Alert type="success">{successMessage}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter your email"
            autoComplete="email"
          />

          <div>
            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <div className="mt-2 text-right">
              <Link 
                to="/forgot-password" 
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>

        <div className="text-center">
          <span className="text-sm text-gray-600">Don't have an account? </span>
          <Link to="/register" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
            Sign up
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
