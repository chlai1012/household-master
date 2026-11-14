import type { Household, HrpRecord, Task, Task2Group, TaskGroup, User } from '../types';

export const users: User[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
  { id: 4, name: 'Dana' },
];

export const taskGroups: TaskGroup[] = [
  { id: 1, name: 'Clean' },
  { id: 2, name: 'Kitchen' },
  { id: 3, name: 'Car' },
  { id: 4, name: 'Garden' },
];

export const households: Household[] = [
  { id: 1, name: 'Household 1', groupIds: [1, 2] },
  { id: 2, name: 'Household 2', groupIds: [1, 3] },
  { id: 3, name: 'Household 3', groupIds: [2, 4] },
];

export const tasks: Task[] = [
  { id: 1, name: 'Wash Dishes', defaultHrp: 10 },
  { id: 2, name: 'Cook Breakfast', defaultHrp: 10 },
  { id: 3, name: 'Cook Lunch', defaultHrp: 20 },
  { id: 4, name: 'Vacuum Floor', defaultHrp: 20 },
  { id: 5, name: 'Clean the Car', defaultHrp: 25 },
  { id: 6, name: 'Sweep Porch', defaultHrp: 18 },
  { id: 7, name: 'Water Plants', defaultHrp: 12 },
  { id: 8, name: 'Cook Dinner', defaultHrp: 15 },
];

export const task2Groups: Task2Group[] = [
  { id: 1, taskId: 1, groupId: 2, isDefault: true },
  { id: 2, taskId: 2, groupId: 2, isDefault: true },
  { id: 3, taskId: 3, groupId: 2, isDefault: false },
  { id: 4, taskId: 4, groupId: 1, isDefault: true },
  { id: 5, taskId: 5, groupId: 3, isDefault: true },
  { id: 6, taskId: 6, groupId: 1, isDefault: false },
  { id: 7, taskId: 7, groupId: 4, isDefault: true },
  { id: 8, taskId: 8, groupId: 2, isDefault: false },
];

export const hrpRecords: HrpRecord[] = [
  { id: 1, householdId: 1, userId: 1, taskId: 1, points: 10, recordedAt: '2026-11-01T08:30:00' },
  { id: 2, householdId: 1, userId: 2, taskId: 2, points: 10, recordedAt: '2026-11-02T07:00:00' },
  { id: 3, householdId: 1, userId: 1, taskId: 3, points: 20, recordedAt: '2026-11-03T12:15:00' },
  { id: 4, householdId: 2, userId: 3, taskId: 5, points: 25, recordedAt: '2026-11-05T15:30:00' },
  { id: 5, householdId: 2, userId: 2, taskId: 8, points: 15, recordedAt: '2026-11-06T18:45:00' },
  { id: 6, householdId: 3, userId: 4, taskId: 6, points: 18, recordedAt: '2026-11-07T09:00:00' },
  { id: 7, householdId: 3, userId: 1, taskId: 7, points: 12, recordedAt: '2026-11-09T17:20:00' },
  { id: 8, householdId: 1, userId: 2, taskId: 4, points: 20, recordedAt: '2026-10-15T13:10:00' },
];
