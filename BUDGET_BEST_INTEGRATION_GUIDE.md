# Budget_Best Integration Guide

**Objective**: Wire up the Budget_Best frontend to the API and integrate all screens into the app navigation.

---

## 📋 Integration Checklist

- [ ] Connect BudgetBestDashboard to API
- [ ] Connect BudgetBestDeposit to API
- [ ] Connect BudgetBestGoals to API
- [ ] Connect BudgetBestGoalDetail to API
- [ ] Connect BudgetBestSettings to API
- [ ] Configure navigation stack
- [ ] Setup authentication flow
- [ ] Test end-to-end flows
- [ ] Deploy database migration
- [ ] Deploy backend code

---

## Step 1: Connect BudgetBestDashboard to API

### Current State
- Uses dummy data: 2 goals, ₦15,000 saved, 15 day streak

### Implementation
```typescript
// BudgetBestDashboard.tsx
import { useFocusEffect } from '@react-navigation/native';
import * as budgetBestApi from '../services/budgetBestApi';

const BudgetBestDashboard = ({ navigation }: any) => {
  const [dashboard, setDashboard] = useState<SavingsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await budgetBestApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      // Show error toast
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#10B981" />;
  }

  return (
    // Use dashboard?.total_savings instead of dummy 15000
    // Use dashboard?.current_streak instead of dummy 15
    // Use dashboard?.tier_level instead of dummy 'silver'
    // Map dashboard?.goals_progress instead of dummy goals
  );
};
```

### Dummy Data Replacement
```typescript
// Replace hardcoded values with API response

// Before
<Text className="text-white text-3xl font-bold">
  ₦15,000
</Text>

// After
<Text className="text-white text-3xl font-bold">
  ₦{dashboard?.total_savings.toLocaleString() ?? 0}
</Text>
```

---

## Step 2: Connect BudgetBestDeposit to API

### Implementation
```typescript
// BudgetBestDeposit.tsx
const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
const [amount, setAmount] = useState(0);
const [reminderTime, setReminderTime] = useState('08:00');
const [loading, setLoading] = useState(false);

const handleDeposit = async () => {
  try {
    setLoading(true);

    // 1. Record transaction
    const transaction = await budgetBestApi.recordTransaction({
      goal_id: selectedGoal,
      amount,
      transaction_type: 'deposit',
      notes: `Deposit via BudgetBestDeposit screen`,
    });

    // 2. Update reminder if checked
    if (reminderEnabled) {
      await budgetBestApi.createReminder({
        goal_id: selectedGoal,
        reminder_time: reminderTime,
        reminder_enabled: true,
      });
    }

    // 3. Show success and navigate back
    showSuccessToast('Deposit recorded successfully!');
    navigation.goBack();
  } catch (err) {
    showErrorToast('Failed to record deposit');
  } finally {
    setLoading(false);
  }
};
```

---

## Step 3: Connect BudgetBestGoals to API

### Implementation
```typescript
// BudgetBestGoals.tsx
const [goals, setGoals] = useState<SavingsGoalResponse[]>([]);
const [loading, setLoading] = useState(true);

useFocusEffect(
  useCallback(() => {
    loadGoals();
  }, [])
);

const loadGoals = async () => {
  try {
    setLoading(true);
    const data = await budgetBestApi.listGoals(true);
    setGoals(data);
  } catch (err) {
    console.error('Failed to load goals:', err);
  } finally {
    setLoading(false);
  }
};

const handleCreateGoal = async () => {
  try {
    await budgetBestApi.createGoal({
      goal_name: form.goalName,
      goal_type: form.goalType,
      target_amount: form.targetAmount,
      monthly_goal: form.monthlyGoal,
      deadline: form.deadline.toISOString().split('T')[0],
    });

    await loadGoals();
    setShowCreateForm(false);
  } catch (err) {
    showErrorToast('Failed to create goal');
  }
};

const handleDeleteGoal = async (goalId: string) => {
  try {
    await budgetBestApi.deleteGoal(goalId);
    await loadGoals();
  } catch (err) {
    showErrorToast('Failed to delete goal');
  }
};
```

---

## Step 4: Connect BudgetBestGoalDetail to API

### Implementation
```typescript
// BudgetBestGoalDetail.tsx
const [goal, setGoal] = useState<SavingsGoalResponse | null>(null);
const [transactions, setTransactions] = useState<SavingsTransactionResponse[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadGoalDetails();
}, [goalId]);

const loadGoalDetails = async () => {
  try {
    setLoading(true);
    const [goalData, txnData] = await Promise.all([
      budgetBestApi.getGoal(goalId),
      budgetBestApi.getGoalTransactions(goalId),
    ]);

    setGoal(goalData);
    setTransactions(txnData);
  } catch (err) {
    console.error('Failed to load goal details:', err);
  } finally {
    setLoading(false);
  }
};

// Map real data to UI
<Text className="text-white text-3xl font-bold">
  ₦{goal?.current_savings.toLocaleString()}
</Text>

{transactions.map((txn) => (
  <View key={txn.id}>
    <Text>{txn.transaction_type}</Text>
    <Text>₦{txn.amount}</Text>
    <Text>{txn.created_at}</Text>
  </View>
))}
```

---

## Step 5: Connect BudgetBestSettings to API

### Implementation
```typescript
// BudgetBestSettings.tsx
const [reminders, setReminders] = useState<ReminderSettingsResponse[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadReminders();
}, []);

const loadReminders = async () => {
  try {
    setLoading(true);
    const goals = await budgetBestApi.listGoals(true);

    // TODO: Fetch reminders from backend
    // For now, map goals to reminder settings
    setReminders(
      goals.map((goal) => ({
        id: `reminder-${goal.id}`,
        goal_id: goal.id,
        reminder_time: '08:00', // Default
        reminder_enabled: false,
        // ... other fields
      }))
    );
  } catch (err) {
    console.error('Failed to load reminders:', err);
  } finally {
    setLoading(false);
  }
};

const handleSaveChanges = async () => {
  try {
    setLoading(true);

    for (const reminder of reminders) {
      if (reminder.id.startsWith('reminder-')) {
        // New reminder
        await budgetBestApi.createReminder({
          goal_id: reminder.goal_id,
          reminder_time: reminder.reminder_time,
          reminder_enabled: reminder.reminder_enabled,
        });
      } else {
        // Existing reminder
        await budgetBestApi.updateReminder(reminder.id, {
          reminder_time: reminder.reminder_time,
          reminder_enabled: reminder.reminder_enabled,
        });
      }
    }

    showSuccessToast('Settings saved!');
  } catch (err) {
    showErrorToast('Failed to save settings');
  } finally {
    setLoading(false);
  }
};
```

---

## Step 6: Configure Navigation Stack

### Create Budget_Best Navigator
```typescript
// navigation/BudgetBestNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BudgetBestDashboard from '../screens/budget_best/BudgetBestDashboard';
import BudgetBestDeposit from '../screens/budget_best/BudgetBestDeposit';
import BudgetBestGoals from '../screens/budget_best/BudgetBestGoals';
import BudgetBestGoalDetail from '../screens/budget_best/BudgetBestGoalDetail';
import BudgetBestSettings from '../screens/budget_best/BudgetBestSettings';
import BudgetBestPolicy from '../screens/budget_best/BudgetBestPolicy';

const Stack = createNativeStackNavigator();

export function BudgetBestNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        cardStyle: { backgroundColor: '#0F172A' },
      }}
    >
      <Stack.Screen
        name="BudgetBestDashboard"
        component={BudgetBestDashboard}
      />
      <Stack.Screen
        name="BudgetBestDeposit"
        component={BudgetBestDeposit}
      />
      <Stack.Screen
        name="BudgetBestGoals"
        component={BudgetBestGoals}
      />
      <Stack.Screen
        name="BudgetBestGoalDetail"
        component={BudgetBestGoalDetail}
      />
      <Stack.Screen
        name="BudgetBestSettings"
        component={BudgetBestSettings}
      />
      <Stack.Screen
        name="BudgetBestPolicy"
        component={BudgetBestPolicy}
      />
    </Stack.Navigator>
  );
}
```

### Add to Bottom Tab Navigator
```typescript
// navigation/BottomTabNavigator.tsx
import { BudgetBestNavigator } from './BudgetBestNavigator';

<Tab.Screen
  name="BudgetBest"
  component={BudgetBestNavigator}
  options={{
    tabBarLabel: 'Save',
    tabBarIcon: ({ color, size }) => (
      <PiggyBank color={color} size={size} />
    ),
  }}
/>
```

### Screen Navigation Links
```typescript
// In BudgetBestDashboard
<TouchableOpacity onPress={() => navigation.navigate('BudgetBestDeposit')}>
  <Text>Deposit</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => navigation.navigate('BudgetBestGoals')}>
  <Text>Manage Goals</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => navigation.navigate('BudgetBestSettings')}>
  <Text>Settings</Text>
</TouchableOpacity>

// In BudgetBestGoals
<TouchableOpacity
  onPress={() =>
    navigation.navigate('BudgetBestGoalDetail', { goalId: goal.id })
  }
>
  <Text>{goal.goal_name}</Text>
</TouchableOpacity>

// In goal detail for deposit
<TouchableOpacity onPress={() => navigation.navigate('BudgetBestDeposit')}>
  <Text>Make a Deposit</Text>
</TouchableOpacity>
```

---

## Step 7: Setup Authentication Flow

### Check User on App Load
```typescript
// App.tsx
import * as budgetBestApi from './services/budgetBestApi';

useEffect(() => {
  const checkAuthAndInitialize = async () => {
    try {
      // Get current user from Supabase
      const { data } = await supabase.auth.getSession();

      if (data?.session) {
        // User is authenticated
        // Initialize Budget_Best data
        const dashboard = await budgetBestApi.getDashboard();

        // Set in global state
        setUserData(dashboard);
      } else {
        // Redirect to login
        navigation.navigate('Auth');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  checkAuthAndInitialize();
}, []);
```

### Add JWT Token to API Calls
```typescript
// services/budgetBestApi.ts - Update all requests
const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data?.session?.access_token}`,
  };
};

export async function getDashboard(): Promise<SavingsDashboard> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/budget-best/dashboard`, {
    headers,
  });
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}
```

---

## Step 8: Test End-to-End Flows

### Test Flow 1: Create Goal & Deposit
```
1. Login to app
2. Navigate to BudgetBest tab
3. Click "New Goal" in BudgetBestGoals
4. Fill: Shop Rent, ₦50,000, May 31
5. Verify goal appears on Dashboard
6. Click "Deposit"
7. Select ₦1,000
8. Select goal
9. Confirm
10. Verify transaction in goal history
11. Verify dashboard balance updated
```

### Test Flow 2: Check Streak
```
1. Make 7 daily deposits
2. Check streak counter on dashboard
3. Verify "Week Warrior" badge appears
4. Verify tier updated to Silver
5. Verify daily total savings increases
```

### Test Flow 3: Set Reminder
```
1. Go to Settings
2. Enable reminder for goal
3. Set time to current time + 1 minute
4. Wait and verify notification
5. Tap notification
6. Verify opens to correct goal
```

---

## Step 9: Deploy Database Migration

```bash
# 1. Connect to Supabase
psql -h db.supabase.co -U postgres -d postgres

# 2. Run migration
\i migrations/006_budget_best_system.sql

# 3. Verify tables created
\dt

# 4. Verify RLS policies
SELECT * FROM pg_policies;
```

---

## Step 10: Deploy Backend Code

```bash
# 1. Commit changes
git add .
git commit -m "feat: add Budget_Best feature"

# 2. Push to production
git push origin main

# 3. Restart backend
systemctl restart mapvo-backend

# 4. Verify health check
curl http://localhost:8000/budget-best/health
```

---

## Environment Variables Required

### Backend (.env)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx
DATABASE_URL=postgresql://user:pass@host/db
```

### Frontend (.env)
```
EXPO_PUBLIC_API_URL=http://192.168.1.175:8000
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
```

---

## Debugging Checklist

- [ ] API endpoints return 200 status
- [ ] Supabase RLS policies allow user queries
- [ ] Authentication token included in headers
- [ ] Dashboard data loads without errors
- [ ] Goals display with correct progress
- [ ] Transactions record successfully
- [ ] Reminders schedule correctly
- [ ] Notifications trigger at set time
- [ ] Navigation transitions work
- [ ] State persists on screen reload

---

## Success Criteria

✅ All screens connected to API  
✅ All CRUD operations functional  
✅ Notifications working  
✅ Database migration deployed  
✅ End-to-end test flows passing  
✅ No console errors  
✅ Performance acceptable (< 2s load time)  

---

**Status**: Ready for implementation  
**Estimated Time**: 4-6 hours  
**Priority**: High
