import "./App.css";

import { type AutomergeUrl, useDocument } from "@automerge/react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group.tsx";
import { useState } from "react";

export interface TaskList {
  tasks: { id: string; text: string; completed: boolean }[];
}

// eslint-disable-next-line react-refresh/only-export-components
export const initTaskList = (): TaskList => {
  return { tasks: [] };
};

function App({ docUrl }: { docUrl: AutomergeUrl }) {
  const [doc, changeDoc] = useDocument<TaskList>(docUrl, {
    // This hooks the `useDocument` into reacts suspense infrastructure so the whole component
    // only renders once the document is loaded
    suspense: true
  });
  const [newTask, setNewTask] = useState("");
  const tasks = doc?.tasks ?? [];

  const addTask = () => {
    const text = newTask.trim();
    if (!text) return;
    changeDoc((d) => {
      d.tasks.push({
        id: crypto?.randomUUID?.() || String(Date.now()),
        text,
        completed: false
      });
    });
    setNewTask("");
  };

  const toggleTask = (id: string) => {
    changeDoc((d) => {
      const t = d.tasks.find((t) => t.id === id);
      if (t) t.completed = !t.completed;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="mb-6 text-4xl font-bold text-gray-900">Automerge Demo</h1>
      <div className="grid max-w-sm gap-3">
        <InputGroup>
          <InputGroupInput
            placeholder="Type your next todo..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Add"
              title="Add"
              size="icon-xs"
              onClick={addTask}
            >
              +
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() => toggleTask(t.id)}
              />
              <span className={t.completed ? "text-gray-500 line-through" : ""}>
                {t.text}
              </span>
            </li>
          ))}
          {!tasks.length && (
            <li className="text-sm text-gray-400">No tasks yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default App;
