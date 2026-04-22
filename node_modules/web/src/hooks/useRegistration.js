import { useState } from 'react';
import pb from '@/lib/pocketbaseClient.js';

export const useRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    // Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    return re.test(password);
  };

  const register = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const { name, email, idNumber, rfidId, batch, password, confirmPassword } = data;

      // 1. Basic Validation
      if (!name || !email || !idNumber || !rfidId || !batch || !password || !confirmPassword) {
        throw new Error("All fields are required.");
      }

      if (!validateEmail(email)) {
        throw new Error("Invalid email format.");
      }

      if (!validatePassword(password)) {
        throw new Error("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      // 2. Check Email Uniqueness
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: `email="${email}"`,
        $autoCancel: false
      });

      if (existingUsers.items.length > 0) {
        throw new Error("An account with this email already exists.");
      }

      // 3. Check Employee ID Uniqueness
      const existingById = await pb.collection('trainees').getList(1, 1, {
        filter: `id_number="${idNumber}"`,
        $autoCancel: false
      });

      if (existingById.items.length > 0) {
        throw new Error("An employee with this ID number already exists.");
      }

      // 4. Check RFID ID Uniqueness
      const existingByRfid = await pb.collection('trainees').getList(1, 1, {
        filter: `unique_id="${rfidId}"`,
        $autoCancel: false
      });

      if (existingByRfid.items.length > 0) {
        throw new Error("An RFID card with this ID already exists. Use a different RFID ID.");
      }

      // 5. Create User Record
      const username = email.split('@')[0]; // Generate username from email
      const newUser = await pb.collection('users').create({
        email,
        username,
        password,
        passwordConfirm: confirmPassword
      }, { $autoCancel: false });

      // 6. Create Trainee Record (check if already exists by email first)
      const existingByEmail = await pb.collection('trainees').getList(1, 1, {
        filter: `email="${email}"`,
        $autoCancel: false
      });

      if (existingByEmail.items.length === 0) {
        // Only create if doesn't exist
        await pb.collection('trainees').create({
          name,
          email,
          id_number: idNumber,
          unique_id: rfidId,
          batch
        }, { $autoCancel: false });
      }

      setLoading(false);
      return { success: true, userId: newUser.id };

    } catch (err) {
      console.error("Registration error:", err);
      console.error("Error response:", err.response);
      console.error("Error data:", err.data);
      
      // Extract detailed error message
      let errorMessage = "An unexpected error occurred during registration.";
      
      if (err.data?.data) {
        // PocketBase validation errors come in err.data.data format
        const fieldErrors = Object.entries(err.data.data)
          .map(([field, error]) => `${field}: ${error.message}`)
          .join(", ");
        errorMessage = fieldErrors || err.message;
      } else if (err.response?.message) {
        errorMessage = err.response.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  return { register, loading, error };
};