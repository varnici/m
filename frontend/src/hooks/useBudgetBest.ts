/**
 * Budget_Best Custom React Hooks
 * Reusable hooks for Budget_Best screens
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as budgetBestApi from '../services/budgetBestApi';
import {
  SavingsDashboard,
  SavingsGoalResponse,
  SavingsStreakResponse,
  SavingsTransactionResponse,
} from '../types/budget-best';

/**
 * Hook to load and manage dashboard data
 */
export function useBudgetBestDashboard() {
  const [dashboard, setDashboard] = useState<SavingsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await budgetBestApi.getDashboard();
      if (isMounted.current) {
        setDashboard(data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { dashboard, loading, error, refresh };
}

/**
 * Hook to manage savings goals
 */
export function useBudgetBestGoals(onlyActive: boolean = true) {
  const [goals, setGoals] = useState<SavingsGoalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await budgetBestApi.listGoals(onlyActive);
      if (isMounted.current) {
        setGoals(data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load goals');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [onlyActive]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
      return () => {};
    }, [loadGoals])
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const createGoal = useCallback(
    async (goalData: any) => {
      try {
        const newGoal = await budgetBestApi.createGoal(goalData);
        if (isMounted.current) {
          setGoals((prev) => [...prev, newGoal]);
        }
        return newGoal;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      try {
        await budgetBestApi.deleteGoal(goalId);
        if (isMounted.current) {
          setGoals((prev) => prev.filter((g) => g.id !== goalId));
        }
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const updateGoal = useCallback(
    async (goalId: string, data: any) => {
      try {
        const updated = await budgetBestApi.updateGoal(goalId, data);
        if (isMounted.current) {
          setGoals((prev) =>
            prev.map((g) => (g.id === goalId ? updated : g))
          );
        }
        return updated;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    await loadGoals();
  }, [loadGoals]);

  return {
    goals,
    loading,
    error,
    createGoal,
    deleteGoal,
    updateGoal,
    refresh,
  };
}

/**
 * Hook to manage a single goal with transactions
 */
export function useBudgetBestGoalDetail(goalId: string) {
  const [goal, setGoal] = useState<SavingsGoalResponse | null>(null);
  const [transactions, setTransactions] = useState<SavingsTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [goalData, txnData] = await Promise.all([
        budgetBestApi.getGoal(goalId),
        budgetBestApi.getGoalTransactions(goalId),
      ]);
      if (isMounted.current) {
        setGoal(goalData);
        setTransactions(txnData);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load goal');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const recordTransaction = useCallback(
    async (amount: number, type: 'deposit' | 'withdrawal' | 'interest') => {
      try {
        const newTxn = await budgetBestApi.recordTransaction({
          goal_id: goalId,
          amount,
          transaction_type: type,
        });
        if (isMounted.current) {
          setTransactions((prev) => [newTxn, ...prev]);
          // Refresh goal to get updated savings
          await load();
        }
        return newTxn;
      } catch (err) {
        throw err;
      }
    },
    [goalId, load]
  );

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return {
    goal,
    transactions,
    loading,
    error,
    recordTransaction,
    refresh,
  };
}

/**
 * Hook to manage user streak
 */
export function useBudgetBestStreak() {
  const [streak, setStreak] = useState<SavingsStreakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await budgetBestApi.getStreak();
      if (isMounted.current) {
        setStreak(data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load streak');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { streak, loading, error, refresh };
}

/**
 * Hook to handle API loading states and errors
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true
) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const execute = useCallback(async () => {
    setStatus('pending');
    setData(null);
    setError(null);
    try {
      const response = await asyncFunction();
      if (isMounted.current) {
        setData(response);
        setStatus('success');
      }
      return response;
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      }
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    return () => {
      isMounted.current = false;
    };
  }, [execute, immediate]);

  return {
    execute,
    status,
    data,
    error,
    loading: status === 'pending',
    isError: status === 'error',
    isSuccess: status === 'success',
  };
}

/**
 * Hook to handle form state for goal creation
 */
export function useGoalForm(initialValues?: any) {
  const [values, setValues] = useState({
    goalName: '',
    goalType: 'custom',
    targetAmount: 0,
    monthlyGoal: 0,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...initialValues,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback(
    (field: string, value: any) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      // Clear error on change
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!values.goalName.trim()) {
      newErrors.goalName = 'Goal name is required';
    }
    if (values.targetAmount <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0';
    }
    if (values.monthlyGoal <= 0) {
      newErrors.monthlyGoal = 'Monthly goal must be greater than 0';
    }
    if (new Date(values.deadline) < new Date()) {
      newErrors.deadline = 'Deadline must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);

  const reset = useCallback(() => {
    setValues({
      goalName: '',
      goalType: 'custom',
      targetAmount: 0,
      monthlyGoal: 0,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ...initialValues,
    });
    setErrors({});
  }, [initialValues]);

  return {
    values,
    handleChange,
    validate,
    reset,
    errors,
  };
}

export default {
  useBudgetBestDashboard,
  useBudgetBestGoals,
  useBudgetBestGoalDetail,
  useBudgetBestStreak,
  useAsync,
  useGoalForm,
};
