import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card, Alert, Select } from '../components/UI';
import { authAPI } from '../utils/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    role: 'student',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      await authAPI.register(registerData);
      navigate('/login', { state: { message: 'Registration successful! Please login.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join the Office Hours Platform
          </p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleChange}
              required
              placeholder="John"
            />
            <Input
              label="Last Name"
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleChange}
              required
              placeholder="Doe"
            />
          </div>

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="john.doe@university.edu"
          />

          <Select
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={[
              { value: 'student', label: 'Student' },
              { value: 'instructor', label: 'Instructor' }
            ]}
          />

          <Input
            label="Department (Optional)"
            name="department"
            type="text"
            value={formData.department}
            onChange={handleChange}
            placeholder="Computer Science"
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="At least 8 characters"
            minLength={8}
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="Confirm your password"
            minLength={8}
          />

          <Button type="submit" fullWidth loading={loading}>
            Create Account
          </Button>
        </form>

        <div className="text-center">
          <span className="text-sm text-gray-600">Already have an account? </span>
          <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
