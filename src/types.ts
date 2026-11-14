export type User = {
  id: number;
  name: string;
};

export type TaskGroup = {
  id: number;
  name: string;
};

export type Task = {
  id: number;
  name: string;
  defaultHrp: number;
};

export type Task2Group = {
  id: number;
  taskId: number;
  groupId: number;
  isDefault: boolean;
};

export type Household = {
  id: number;
  name: string;
  groupIds: number[];
};

export type HrpRecord = {
  id: number;
  householdId: number;
  userId: number;
  taskId: number;
  points: number;
  recordedAt: string;
};
