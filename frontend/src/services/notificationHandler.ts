/**
 * Notifications Handler for Budget_Best
 * Handles daily reminders and push notifications
 */

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { budgetBestApi } from './budgetBestApi';

const NOTIFICATION_TASK_NAME = 'BUDGET_BEST_REMINDER_TASK';
const DAILY_REMINDER_KEY = 'BUDGET_BEST_DAILY_REMINDERS';

// Configure notification behavior
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Handle notification responses
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('Notification response:', response);
      // Handle notification tap
      const { goalId } = response.notification.request.content.data;
      if (goalId) {
        // Navigate to goal detail screen
        // navigation.navigate('BudgetBestGoalDetail', { goalId });
      }
    }
  );

  return subscription;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermission() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Schedule a daily reminder notification
 * @param goalId Goal ID
 * @param goalName Goal name
 * @param reminderTime Time in HH:MM format
 */
export async function scheduleDailyReminder(
  goalId: string,
  goalName: string,
  reminderTime: string
) {
  try {
    const [hours, minutes] = reminderTime.split(':').map(Number);

    // Create trigger for daily notification
    const trigger = {
      hour: hours,
      minute: minutes,
      repeats: true,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "It's time to save 💰",
        body: `Deposit your savings for ${goalName} now!`,
        data: { goalId, goalName },
        sound: 'default',
        badge: 1,
        categoryIdentifier: 'BUDGET_BEST_REMINDER',
      },
      trigger,
    });

    // Store reminder mapping
    const reminders = await getStoredReminders();
    reminders[goalId] = {
      notificationId,
      goalName,
      reminderTime,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(
      DAILY_REMINDER_KEY,
      JSON.stringify(reminders)
    );

    return notificationId;
  } catch (err) {
    console.error('Error scheduling reminder:', err);
    throw err;
  }
}

/**
 * Cancel a reminder
 * @param goalId Goal ID
 */
export async function cancelReminder(goalId: string) {
  try {
    const reminders = await getStoredReminders();
    const reminder = reminders[goalId];

    if (reminder) {
      await Notifications.cancelNotificationAsync(reminder.notificationId);
      delete reminders[goalId];
      await AsyncStorage.setItem(
        DAILY_REMINDER_KEY,
        JSON.stringify(reminders)
      );
    }
  } catch (err) {
    console.error('Error canceling reminder:', err);
  }
}

/**
 * Get all stored reminders
 */
export async function getStoredReminders() {
  try {
    const stored = await AsyncStorage.getItem(DAILY_REMINDER_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error('Error getting stored reminders:', err);
    return {};
  }
}

/**
 * Update all reminders from backend
 */
export async function syncRemindersWithBackend() {
  try {
    // Get all goals with reminders enabled
    const goals = await budgetBestApi.listGoals(true);

    const reminders = await getStoredReminders();

    for (const goal of goals) {
      // TODO: Fetch reminder settings from backend
      // const reminder = await budgetBestApi.getReminder(goal.id);
      // if (reminder.reminder_enabled) {
      //   await scheduleDailyReminder(goal.id, goal.goal_name, reminder.reminder_time);
      // } else {
      //   await cancelReminder(goal.id);
      // }
    }
  } catch (err) {
    console.error('Error syncing reminders:', err);
  }
}

/**
 * Send immediate notification (for testing)
 */
export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Budget_Best Test',
      body: 'This is a test notification',
      sound: 'default',
      badge: 1,
    },
    trigger: { seconds: 2 },
  });
}

/**
 * Handle milestone notifications
 * @param goalId Goal ID
 * @param milestone Milestone (e.g., "halfway", "goal_reached")
 * @param amount Amount saved
 * @param target Target amount
 */
export async function notifyMilestone(
  goalId: string,
  milestone: 'halfway' | 'goal_reached' | 'streaks' | 'tier_up',
  amount: number,
  target?: number
) {
  const messages = {
    halfway: `🎯 You're halfway there! ₦${amount.toLocaleString()} saved.`,
    goal_reached: `🎉 Goal completed! You saved ₦${amount.toLocaleString()}.`,
    streaks: `🔥 ${amount} day streak! Keep going!`,
    tier_up: `⬆️ Tier promoted! You reached ${target} tier.`,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Milestone Reached 🏆',
      body: messages[milestone],
      data: { goalId, milestone },
      sound: 'default',
      badge: 1,
    },
    trigger: { seconds: 1 },
  });
}

/**
 * Register background task for scheduled reminders
 */
TaskManager.defineTask(
  NOTIFICATION_TASK_NAME,
  async () => {
    try {
      // This runs in the background
      const reminders = await getStoredReminders();

      for (const [goalId, reminder] of Object.entries(reminders)) {
        const { reminderTime, goalName } = reminder as any;

        // Check if it's time to send reminder
        const now = new Date();
        const [hours, minutes] = reminderTime.split(':').map(Number);

        if (
          now.getHours() === hours &&
          now.getMinutes() >= minutes &&
          now.getMinutes() < minutes + 1
        ) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "It's time to save 💰",
              body: `Deposit your savings for ${goalName} now!`,
              data: { goalId, goalName },
              sound: 'default',
              badge: 1,
            },
            trigger: { seconds: 1 },
          });
        }
      }

      return TaskManager.TaskManagerTaskBody;
    } catch (err) {
      console.error('Error in background reminder task:', err);
      return TaskManager.TaskManagerTaskBody;
    }
  }
);

/**
 * Start background task for reminders
 */
export async function startBackgroundReminders() {
  try {
    await TaskManager.registerTaskAsync(NOTIFICATION_TASK_NAME, {
      minimumInterval: 60, // Check every minute
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err) {
    console.error('Error starting background reminders:', err);
  }
}

/**
 * Stop background task
 */
export async function stopBackgroundReminders() {
  try {
    await TaskManager.unregisterTaskAsync(NOTIFICATION_TASK_NAME);
  } catch (err) {
    console.error('Error stopping background reminders:', err);
  }
}

/**
 * Clear all reminders
 */
export async function clearAllReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(DAILY_REMINDER_KEY);
  } catch (err) {
    console.error('Error clearing reminders:', err);
  }
}

export default {
  configureNotifications,
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelReminder,
  getStoredReminders,
  syncRemindersWithBackend,
  sendTestNotification,
  notifyMilestone,
  startBackgroundReminders,
  stopBackgroundReminders,
  clearAllReminders,
};
