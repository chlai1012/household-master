import { useEffect, useMemo, useState } from 'react';
import { households, hrpRecords as initialRecords, task2Groups, taskGroups, tasks, users } from './lib/mockData';
import { supabase } from './lib/supabase';
import type { HrpRecord, Task, Task2Group } from './types';

const GROUP_ALL = 0;
const GROUP_NONE = -1;

const userLookup = Object.fromEntries(users.map((user) => [user.id, user]));
const householdLookup = Object.fromEntries(households.map((household) => [household.id, household]));

const getCurrentUserIdFromUrl = (): number | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const raw = params.get('userId');

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

function App() {
  const [records, setRecords] = useState<HrpRecord[]>(initialRecords);
  const [taskCatalog, setTaskCatalog] = useState<Task[]>(tasks);
  const [taskLinks, setTaskLinks] = useState<Task2Group[]>(task2Groups);
  const [currentUserId, setCurrentUserId] = useState<number | null>(getCurrentUserIdFromUrl());
  const [selectedGroupId, setSelectedGroupId] = useState<number>(GROUP_ALL);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<number | null>(
    households[0]?.id ?? null,
  );
  const [taskSearch, setTaskSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [recordPoints, setRecordPoints] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyGroupId, setHistoryGroupId] = useState<number>(0);
  const [historyUserId, setHistoryUserId] = useState<number>(0);
  const [historyTaskId, setHistoryTaskId] = useState<number>(0);
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [taskInputFocused, setTaskInputFocused] = useState(false);

  const categoryOptions = useMemo(
    () => [{ id: GROUP_ALL, name: 'All groups' }, { id: GROUP_NONE, name: 'No group' }, ...taskGroups],
    [],
  );
  const currentUser = currentUserId ? userLookup[currentUserId] ?? { id: currentUserId, name: `User ${currentUserId}` } : null;
  const taskLookup = useMemo(
    () => Object.fromEntries(taskCatalog.map((task) => [task.id, task])),
    [taskCatalog],
  );

  const groupFilteredHouseholds = useMemo(() => {
    if (selectedGroupId === GROUP_ALL) {
      return households;
    }

    if (selectedGroupId === GROUP_NONE) {
      return households.filter((household) => household.groupIds.length === 0);
    }

    return households.filter((household) => household.groupIds.includes(selectedGroupId));
  }, [selectedGroupId]);

  useEffect(() => {
    const nextHousehold = groupFilteredHouseholds[0] ?? households[0] ?? null;
    setSelectedHouseholdId(nextHousehold?.id ?? null);
  }, [groupFilteredHouseholds]);

  const defaultTaskForSelectedGroup = useMemo(
    () => {
      if (selectedGroupId === GROUP_ALL) {
        const defaultLink = taskLinks.find((link) => link.isDefault);
        return defaultLink ? taskLookup[defaultLink.taskId] ?? null : null;
      }

      if (selectedGroupId === GROUP_NONE) {
        return null;
      }

      const defaultLink = taskLinks.find(
        (link) => link.groupId === selectedGroupId && link.isDefault,
      );

      return defaultLink ? taskLookup[defaultLink.taskId] ?? null : null;
    },
    [selectedGroupId, taskLinks, taskLookup],
  );

  const availableTasks = useMemo(() => {
    if (selectedGroupId === GROUP_ALL) {
      const linkedTaskIds = taskLinks.map((link) => link.taskId);
      return taskCatalog.filter((task) => linkedTaskIds.includes(task.id));
    }

    const linkedTaskIds = taskLinks
      .filter((link) => link.groupId === selectedGroupId)
      .map((link) => link.taskId);

    return taskCatalog.filter((task) => linkedTaskIds.includes(task.id));
  }, [selectedGroupId, taskCatalog, taskLinks]);

  const matchingTaskSuggestions = useMemo(() => {
    if (!taskSearch.trim()) {
      return availableTasks;
    }

    const search = taskSearch.trim().toLowerCase();
    return availableTasks.filter((task) => task.name.toLowerCase().includes(search));
  }, [availableTasks, taskSearch]);

  const shouldShowTaskSuggestions = taskInputFocused && taskSearch.trim().length > 0 && matchingTaskSuggestions.length > 0;

  useEffect(() => {
    if (selectedGroupId === GROUP_ALL || selectedGroupId === GROUP_NONE) {
      setSelectedTaskId(null);
      setTaskSearch('');
      setRecordPoints(0);
      return;
    }

    const nextTask = defaultTaskForSelectedGroup ?? availableTasks[0] ?? null;
    if (nextTask) {
      setSelectedTaskId(nextTask.id);
      setTaskSearch(nextTask.name);
      setRecordPoints(nextTask.defaultHrp);
      return;
    }

    setSelectedTaskId(null);
    setTaskSearch('');
    setRecordPoints(0);
  }, [availableTasks, defaultTaskForSelectedGroup, selectedGroupId]);

  const leaderSummary = useMemo(() => {
    const totals = users.map((user) => ({
      user,
      total: records
        .filter((record) => record.userId === user.id)
        .reduce((sum, record) => sum + record.points, 0),
    }));

    const leader = totals.reduce(
      (best, current) => (current.total > best.total ? current : best),
      totals[0] ?? { user: users[0], total: 0 },
    );

    return leader;
  }, [records]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    return records.filter((record) => {
      const task = taskLookup[record.taskId];
      const taskGroupIds = taskLinks.filter((link) => link.taskId === record.taskId).map((link) => link.groupId);
      const date = new Date(record.recordedAt);
      const matchesGroup =
        historyGroupId === 0 ||
        (historyGroupId === GROUP_NONE
          ? taskGroupIds.includes(GROUP_NONE)
          : taskGroupIds.includes(historyGroupId));
      const matchesTask = historyTaskId === 0 || record.taskId === historyTaskId;
      const matchesUser = historyUserId === 0 || record.userId === historyUserId;
      const matchesMonth = monthFilter === 'all' || date.getMonth() + 1 === Number(monthFilter);
      const matchesYear = yearFilter === 'all' || date.getFullYear() === Number(yearFilter);
      const matchesFrom = !dateFrom || date >= new Date(dateFrom);
      const matchesTo = !dateTo || date <= new Date(`${dateTo}T23:59:59`);
      const textSearch =
        !query ||
        task?.name.toLowerCase().includes(query) ||
        userLookup[record.userId]?.name.toLowerCase().includes(query);

      return matchesGroup && matchesTask && matchesUser && matchesMonth && matchesYear && matchesFrom && matchesTo && textSearch;
    });
  }, [dateFrom, dateTo, historyGroupId, historySearch, historyTaskId, historyUserId, monthFilter, records, taskLinks, taskLookup, yearFilter]);

  const historyTaskOptions = useMemo(() => {
    if (historyGroupId === 0) {
      return taskCatalog;
    }

    const taskIdsForGroup = taskLinks
      .filter((link) => link.groupId === historyGroupId)
      .map((link) => link.taskId);

    return taskCatalog.filter((task) => taskIdsForGroup.includes(task.id));
  }, [historyGroupId, taskCatalog, taskLinks]);

  useEffect(() => {
    if (historyTaskId !== 0 && !historyTaskOptions.some((task) => task.id === historyTaskId)) {
      setHistoryTaskId(0);
    }
  }, [historyTaskId, historyTaskOptions]);

  const totalFilteredPoints = filteredHistory.reduce((sum, record) => sum + record.points, 0);
  const years = Array.from(new Set(records.map((record) => new Date(record.recordedAt).getFullYear()))).sort((a, b) => b - a);

  const handleSelectGroup = (value: number) => {
    setSelectedGroupId(value);
  };

  const handleTaskSuggestionClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setTaskSearch(task.name);
    setRecordPoints(task.defaultHrp);
  };

  const handleRecordSave = () => {
    if (!currentUserId) {
      setStatusMessage('Missing userId in the URL. Please open the page with ?userId=1 or another valid user ID.');
      return;
    }

    if (!selectedHouseholdId) {
      setStatusMessage('Please choose a household before recording HP.');
      return;
    }

    const trimmedTaskName = taskSearch.trim();
    if (!trimmedTaskName) {
      setStatusMessage('Please choose the task you completed.');
      return;
    }

    if (recordPoints <= 0) {
      setStatusMessage('HP must be greater than zero.');
      return;
    }

    const normalizedTaskName = trimmedTaskName.trim();
    const existingTask = taskCatalog.find(
      (task) => task.name.toLowerCase() === normalizedTaskName.toLowerCase(),
    );

    const resolvedTaskId = selectedTaskId ?? existingTask?.id ?? null;
    const assignedGroupId = selectedGroupId === GROUP_ALL ? GROUP_NONE : selectedGroupId;

    let newTask: Task | null = null;
    let finalTaskId = resolvedTaskId;

    if (!resolvedTaskId) {
      const nextTaskId = Math.max(0, ...taskCatalog.map((task) => task.id)) + 1;
      newTask = {
        id: nextTaskId,
        name: normalizedTaskName,
        defaultHrp: recordPoints,
      };

      setTaskCatalog((current) => [...current, newTask!]);
      setTaskLinks((current) => [
        ...current,
        {
          id: Date.now() + 1,
          taskId: nextTaskId,
          groupId: assignedGroupId,
          isDefault: false,
        },
      ]);
      finalTaskId = nextTaskId;
      setSelectedTaskId(nextTaskId);
    }

    const newRecord: HrpRecord = {
      id: Date.now(),
      householdId: selectedHouseholdId,
      userId: currentUserId,
      taskId: finalTaskId ?? Math.max(0, ...taskCatalog.map((task) => task.id)) + 1,
      points: recordPoints,
      recordedAt: new Date().toISOString(),
    };

    if (supabase) {
      void (async () => {
        try {
          if (newTask) {
            const taskInsertResponse = await supabase.from('tasks').insert({
              name: newTask.name,
              default_hrp: newTask.defaultHrp,
            });

            if (taskInsertResponse.error) {
              setStatusMessage(`Database save failed: ${taskInsertResponse.error.message}`);
              return;
            }

            const linkageInsertResponse = await supabase.from('task2groups').insert({
              task_id: newTask.id,
              group_id: assignedGroupId,
              is_default: false,
            });

            if (linkageInsertResponse.error) {
              setStatusMessage(`Database save failed: ${linkageInsertResponse.error.message}`);
              return;
            }
          }

          const { error } = await supabase.from('hrp_records').insert({
            household_id: newRecord.householdId,
            user_id: newRecord.userId,
            task_id: newRecord.taskId,
            points: newRecord.points,
            recorded_at: newRecord.recordedAt,
          });

          if (error) {
            setStatusMessage(`Database save failed: ${error.message}`);
            return;
          }

          setRecords((current) => [newRecord, ...current]);
          setStatusMessage('HP recorded successfully.');
        } catch (error) {
          setStatusMessage('Database save failed. Please try again.');
        }
      })();
    } else {
      setRecords((current) => [newRecord, ...current]);
      setStatusMessage('HP recorded successfully in demo mode.');
    }

    setSelectedTaskId(null);
    setTaskSearch('');
    setRecordPoints(0);
    setEditingRecordId(null);
  };

  const handleDeleteRecord = (recordId: number) => {
    setRecords((current) => current.filter((record) => record.id !== recordId));
    setStatusMessage('Record deleted.');
  };

  const handleEditRecord = (recordId: number) => {
    const recordToEdit = records.find((record) => record.id === recordId);
    if (!recordToEdit) {
      return;
    }

    const task = taskLookup[recordToEdit.taskId];
    const linkedGroupIds = taskLinks.filter((link) => link.taskId === recordToEdit.taskId).map((link) => link.groupId);
    setEditingRecordId(recordId);
    setSelectedGroupId(linkedGroupIds.includes(GROUP_NONE) ? GROUP_NONE : householdLookup[recordToEdit.householdId]?.groupIds[0] ?? GROUP_ALL);
    setSelectedHouseholdId(recordToEdit.householdId);
    setSelectedTaskId(recordToEdit.taskId);
    setTaskSearch(task?.name ?? '');
    setRecordPoints(recordToEdit.points);
    setStatusMessage('Editing record. Update the points and save again.');
  };

  const canEdit = editingRecordId !== null;

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1>Household Master</h1>
        <div className="leaderline">
          {leaderSummary.user.name} currently has the highest HP with {leaderSummary.total} points.
        </div>
      </header>

      <div className="progress-panel" aria-label="User progress area" />

      <section className="record-card">
        <div className="record-sentence">
          <strong>{currentUser?.name ?? 'Unknown user'}</strong> did {taskSearch || '________'} for {recordPoints || 0} HP
        </div>

        <div className="entry-line">
          <label>
            <span className="entry-prefix">Category</span>
            <select value={selectedGroupId} onChange={(event) => handleSelectGroup(Number(event.target.value))}>
              {categoryOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <div className="task-field">
            <label>
              <span className="entry-prefix">Task</span>
              <input
                id="task-search"
                type="text"
                value={taskSearch}
                placeholder="Type task name"
                onFocus={() => setTaskInputFocused(true)}
                onBlur={() => setTimeout(() => setTaskInputFocused(false), 120)}
                onChange={(event) => {
                  const value = event.target.value;
                  setTaskInputFocused(true);
                  setTaskSearch(value);
                  const exactMatch = availableTasks.find(
                    (task) => task.name.toLowerCase() === value.trim().toLowerCase(),
                  );

                  if (exactMatch) {
                    setSelectedTaskId(exactMatch.id);
                    setRecordPoints(exactMatch.defaultHrp);
                  } else {
                    setSelectedTaskId(null);
                  }
                }}
              />
            </label>

            {shouldShowTaskSuggestions && (
              <div className="task-suggestions">
                {matchingTaskSuggestions.map((task) => (
                  <button type="button" key={task.id} onClick={() => handleTaskSuggestionClick(task)}>
                    {task.name} ({task.defaultHrp} HP)
                  </button>
                ))}
              </div>
            )}
          </div>

          <label>
            <span className="entry-prefix">HP</span>
            <input
              type="number"
              min="0"
              value={recordPoints}
              onChange={(event) => setRecordPoints(Number(event.target.value) || 0)}
              aria-label="HP points"
            />
          </label>
        </div>

        <div className="action-row">
          <button type="button" onClick={handleRecordSave}>
            {canEdit ? 'Update HP' : 'Record HP'}
          </button>
          {currentUserId ? <span className="user-indicator">Logged in as user #{currentUserId}</span> : null}
        </div>

        {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
      </section>

      <section className="history-panel">
        <div className="history-header">
          <h2>HP History</h2>
          <div className="history-filters">
            <select value={historyGroupId} onChange={(event) => setHistoryGroupId(Number(event.target.value))}>
              <option value={0}>All groups</option>
              <option value={GROUP_NONE}>No group</option>
              {taskGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            <select value={historyUserId} onChange={(event) => setHistoryUserId(Number(event.target.value))}>
              <option value={0}>All users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

            <select value={historyTaskId} onChange={(event) => setHistoryTaskId(Number(event.target.value))}>
              <option value={0}>All tasks</option>
              {historyTaskOptions.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>

            <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
              <option value="all">All months</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={String(month)}>
                  {new Date(2024, month - 1, 1).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>

            <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
              <option value="all">All years</option>
              {years.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>

            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            <input
              type="text"
              placeholder="Search task or user"
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
            />
          </div>
        </div>

        <div className="summary-row">
          <strong>Total HP:</strong> {totalFilteredPoints}
        </div>

        <div className="history-list">
          {filteredHistory.length === 0 ? (
            <p className="empty-state">No records match the active filters.</p>
          ) : (
            filteredHistory.map((record) => {
              const task = taskLookup[record.taskId];
              const user = userLookup[record.userId];

              return (
                <div key={record.id} className="history-item">
                  <div>
                    <div>{task?.name}</div>
                  </div>
                  <div>{record.points} HP</div>
                  <div>{user?.name}</div>
                  <div>{formatDate(record.recordedAt)}</div>
                  <div className="row-actions">
                    <button type="button" onClick={() => handleEditRecord(record.id)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDeleteRecord(record.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
