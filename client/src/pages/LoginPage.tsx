import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { AxiosError } from 'axios';
import { ApiResponse } from '../types';

interface FormErrors {
  phone?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    phone: '+998',
    password: '',
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!/^\+998[0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = 'Phone must be in +998XXXXXXXXX format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await login({
        phone: formData.phone,
        password: formData.password,
      });
      navigate('/');
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      if (axiosError.response?.data?.error) {
        setErrors({ general: axiosError.response.data.error });
      } else {
        setErrors({ general: 'Login failed. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Windchat"
      subtitle="Sign in to your account"
    >
      <form onSubmit={handleSubmit}>
        {errors.general && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
            {errors.general}
          </div>
        )}

        <InputField
          label="Phone Number"
          type="tel"
          placeholder="+998901234567"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          error={errors.phone}
        />

        <InputField
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          error={errors.password}
          showPasswordToggle
        />

        <Button type="submit" isLoading={isLoading} className="mt-6">
          Sign In
        </Button>

        <p className="text-center text-telegram-text-secondary mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-telegram-blue hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
