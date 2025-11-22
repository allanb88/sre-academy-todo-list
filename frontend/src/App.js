import React, { useState, useEffect } from "react";
import GoalInput from "./components/goals/GoalInput";
import CourseGoals from "./components/goals/CourseGoals";
import ErrorAlert from "./components/UI/ErrorAlert";

function App() {
  const [loadedGoals, setLoadedGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ---------- 1. Construimos la URL base ---------- */
  const getBaseUrl = () => {
    // Si estamos en el navegador usamos la IP del nodo + NodePort
    const host = window.location.hostname; // IP del nodo (minikube ip)
    const port = 30081; // NodePort del backend
    return `http://${host}:${port}`;
  };

  const API_BASE = getBaseUrl();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/goals`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Fetching goals failed.");
        setLoadedGoals(data.goals);
      } catch (err) {
        setError(err.message || "Fetching goals failed – server error.");
      }
      setIsLoading(false);
    }
    fetchData();
  }, [API_BASE]);

  async function addGoalHandler(goalText) {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: goalText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Adding goal failed.");
      setLoadedGoals((prev) => [{ id: data.goal.id, text: goalText }, ...prev]);
    } catch (err) {
      setError(err.message || "Adding goal failed – server error.");
    }
    setIsLoading(false);
  }

  async function deleteGoalHandler(goalId) {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/goals/${goalId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Deleting goal failed.");
      setLoadedGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch (err) {
      setError(err.message || "Deleting goal failed – server error.");
    }
    setIsLoading(false);
  }

  return (
    <div>
      {error && <ErrorAlert errorText={error} />}
      <GoalInput onAddGoal={addGoalHandler} />
      {!isLoading && (
        <CourseGoals goals={loadedGoals} onDeleteGoal={deleteGoalHandler} />
      )}
    </div>
  );
}

export default App;
