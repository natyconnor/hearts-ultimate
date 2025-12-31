import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

interface Note {
  id: number;
  content?: string;
  created_at?: string;
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNotes() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("Notes")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setNotes(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch notes");
        console.error("Error fetching notes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchNotes();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <h1>Notes</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Notes</h1>
        <p className="error">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Notes</h1>
      {notes.length === 0 ? (
        <p>No notes found.</p>
      ) : (
        <ul className="notes-list">
          {notes.map((note) => (
            <li key={note.id} className="note-item">
              {note.content && <p>{note.content}</p>}
              {note.created_at && (
                <small>{new Date(note.created_at).toLocaleDateString()}</small>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
