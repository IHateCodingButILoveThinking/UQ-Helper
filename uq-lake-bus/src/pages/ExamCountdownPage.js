import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  GraduationCap,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";

const EXAMS_STORAGE_KEY = "uq-campus-exams-v1";
const DEFAULT_EXAM_TIME = "09:00";
const PAGE_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] };

export default function ExamCountdownPage() {
  const [exams, setExams] = useState(getInitialExams);
  const [now, setNow] = useState(() => Date.now());
  const [showModal, setShowModal] = useState(false);
  const [pendingDeleteExam, setPendingDeleteExam] = useState(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(createEmptyDraft);
  const isModalOpen = showModal || Boolean(pendingDeleteExam);
  const modalPortalTarget =
    typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
    } catch (storageError) {
      console.error("Could not save exam countdowns.", storageError);
    }
  }, [exams]);

  useEffect(() => {
    if (!isModalOpen || typeof document === "undefined") {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.classList.add("exam-modal-open");
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.classList.remove("exam-modal-open");
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isModalOpen]);

  const upcomingExams = useMemo(() => {
    return exams
      .map((exam) => ({
        ...exam,
        targetMs: buildExamTimestamp(exam.date, exam.time),
      }))
      .sort((left, right) => left.targetMs - right.targetMs);
  }, [exams]);

  const openModal = () => {
    setDraft(createEmptyDraft());
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError("");
  };

  const handleDraftChange = (field, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    setError("");
  };

  const handleSaveExam = () => {
    if (!draft.courseCode.trim() || !draft.date || !draft.location.trim()) {
      setError("Please add the course code, date, and location first.");
      return;
    }

    if (!draft.time) {
      setError("Please set the exam time.");
      return;
    }

    const targetMs = buildExamTimestamp(draft.date, draft.time);

    if (!Number.isFinite(targetMs) || targetMs <= Date.now()) {
      setError("Please choose a future exam time.");
      return;
    }

    setExams((currentExams) => [
      ...currentExams,
      {
        id: createExamId(),
        courseCode: draft.courseCode.trim().toUpperCase(),
        date: draft.date,
        time: draft.time,
        location: draft.location.trim(),
      },
    ]);
    closeModal();
  };

  const handleDeleteExam = (exam) => {
    setPendingDeleteExam(exam);
  };

  const confirmDeleteExam = () => {
    if (!pendingDeleteExam) {
      return;
    }

    setExams((currentExams) =>
      currentExams.filter((exam) => exam.id !== pendingDeleteExam.id),
    );
    setPendingDeleteExam(null);
  };

  const modalLayer = (
    <>
      <AnimatePresence>
        {showModal ? (
          <motion.div
            className="exam-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="exam-modal"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.96 }}
              transition={PAGE_TRANSITION}
              role="dialog"
              aria-modal="true"
              aria-labelledby="exam-form-title"
            >
              <div className="exam-modal-head">
                <div>
                  <p>New exam</p>
                  <h2 id="exam-form-title">Add exam details</h2>
                </div>
              </div>

              <div className="exam-modal-step">
                <label className="exam-field">
                  <span>Course Code</span>
                  <input
                    type="text"
                    placeholder="CSSE1001"
                    value={draft.courseCode}
                    onChange={(event) =>
                      handleDraftChange("courseCode", event.target.value)
                    }
                  />
                </label>

                <label className="exam-field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) =>
                      handleDraftChange("date", event.target.value)
                    }
                  />
                </label>

                <AnimatePresence initial={false}>
                  {draft.date ? (
                    <motion.label
                      key="exam-time-field"
                      className="exam-field exam-field-time"
                      initial={{ opacity: 0, y: 8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: 8, height: 0 }}
                      transition={PAGE_TRANSITION}
                    >
                      <span>Exam Time</span>
                      <input
                        type="time"
                        value={draft.time}
                        onChange={(event) =>
                          handleDraftChange("time", event.target.value)
                        }
                      />
                      <small>Use the official start time from your timetable.</small>
                    </motion.label>
                  ) : null}
                </AnimatePresence>

                <label className="exam-field">
                  <span>Location</span>
                  <input
                    type="text"
                    placeholder="Great Court, Room 23"
                    value={draft.location}
                    onChange={(event) =>
                      handleDraftChange("location", event.target.value)
                    }
                  />
                </label>
              </div>

              {error ? (
                <div className="exam-modal-error" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <p>{error}</p>
                </div>
              ) : null}

              <div className="exam-modal-actions">
                <button
                  type="button"
                  className="exam-secondary-button"
                  onClick={closeModal}
                >
                  <span>Cancel</span>
                </button>

                <button
                  type="button"
                  className="exam-primary-button"
                  onClick={handleSaveExam}
                >
                  <Plus aria-hidden="true" />
                  <span>Save Exam</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteExam ? (
          <motion.div
            className="exam-modal-overlay exam-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="exam-confirm-card"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={PAGE_TRANSITION}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="exam-delete-title"
              aria-describedby="exam-delete-copy"
            >
              <span className="exam-confirm-icon" aria-hidden="true">
                <Trash2 />
              </span>
              <div className="exam-confirm-copy">
                <p>Delete exam?</p>
                <h2 id="exam-delete-title">{pendingDeleteExam.courseCode}</h2>
                <span id="exam-delete-copy">
                  This countdown will be removed from your saved exam list.
                </span>
              </div>
              <div className="exam-modal-actions">
                <button
                  type="button"
                  className="exam-secondary-button"
                  onClick={() => setPendingDeleteExam(null)}
                >
                  Keep it
                </button>
                <button
                  type="button"
                  className="exam-danger-button"
                  onClick={confirmDeleteExam}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );

  return (
    <>
      <section className="exam-countdown-page" aria-label="Exam countdown">
      <motion.header
        className="exam-countdown-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={PAGE_TRANSITION}
      >
        <div className="exam-countdown-header-copy">
          <p>Exam Countdown</p>
          <h1>Stay ahead of every final.</h1>
          <span>Track the exact time left for each exam in one calm dashboard.</span>
        </div>

        <button
          type="button"
          className="exam-add-button"
          onClick={openModal}
        >
          <Plus aria-hidden="true" />
          <span>Add Exam</span>
        </button>
      </motion.header>

      {upcomingExams.length ? (
        <motion.div
          className="exam-countdown-grid"
          initial="hidden"
          animate="visible"
          variants={gridVariants}
        >
          <AnimatePresence>
            {upcomingExams.map((exam) => {
              const countdown = getCountdownParts(exam.targetMs, now);
              const isUrgent = exam.targetMs - now <= 24 * 60 * 60 * 1000;

              return (
                <motion.article
                  key={exam.id}
                  className={`exam-card ${isUrgent ? "urgent" : ""}`}
                  layout
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: 10, scale: 0.96, filter: "blur(4px)" }}
                  whileHover={{ y: -4 }}
                  transition={{
                    layout: { type: "spring", stiffness: 350, damping: 22 },
                    duration: 0.26,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {isUrgent ? <span className="exam-urgent-strip" aria-hidden="true" /> : null}

                  <div className="exam-card-top">
                    <div className="exam-card-title-row">
                      {isUrgent ? (
                        <span className="exam-urgent-dot-wrap" aria-hidden="true">
                          <span className="exam-urgent-dot-ping" />
                          <span className="exam-urgent-dot" />
                        </span>
                      ) : null}
                      <h2>{exam.courseCode}</h2>
                    </div>

                    <button
                      type="button"
                      className="exam-delete-button"
                      aria-label={`Delete ${exam.courseCode}`}
                      onClick={() => handleDeleteExam(exam)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>

                  <div className="exam-card-meta">
                    <span>
                      <CalendarDays aria-hidden="true" />
                      <strong>{formatExamDate(exam.date)}</strong>
                    </span>
                    <span>
                      <Clock3 aria-hidden="true" />
                      <strong>{formatExamTime(exam.time)}</strong>
                    </span>
                    <span>
                      <MapPin aria-hidden="true" />
                      <strong>{exam.location}</strong>
                    </span>
                  </div>

                  <div className="exam-card-divider" />

                  <div className="exam-countdown-block" aria-label={`${exam.courseCode} countdown`}>
                    <CountdownUnit label="Days" value={countdown.days} />
                    <CountdownUnit label="Hrs" value={countdown.hours} />
                    <CountdownUnit label="Mins" value={countdown.minutes} />
                    <CountdownUnit label="Secs" value={countdown.seconds} />
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          className="exam-empty-state"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PAGE_TRANSITION}
        >
          <span className="exam-empty-icon">
            <GraduationCap aria-hidden="true" />
          </span>
          <h2>No exams added yet</h2>
          <p>Add your first final so the countdown starts working for you.</p>
        </motion.div>
      )}
      </section>
      {modalPortalTarget ? createPortal(modalLayer, modalPortalTarget) : null}
    </>
  );
}

function CountdownUnit({ label, value }) {
  return (
    <div className="exam-countdown-unit">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
    </div>
  );
}

function createEmptyDraft() {
  return {
    courseCode: "",
    date: "",
    time: DEFAULT_EXAM_TIME,
    location: "",
  };
}

function getInitialExams() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(EXAMS_STORAGE_KEY) ?? "[]",
    );

    return Array.isArray(parsed)
      ? parsed.filter(isValidExamDraft).map((exam) => ({
          id: exam.id || createExamId(),
          courseCode: String(exam.courseCode).trim().toUpperCase(),
          date: String(exam.date).trim(),
          time: String(exam.time).trim(),
          location: String(exam.location).trim(),
        }))
      : [];
  } catch (storageError) {
    console.error("Could not load saved exams.", storageError);
    return [];
  }
}

function isValidExamDraft(exam) {
  return (
    Boolean(exam) &&
    typeof exam === "object" &&
    String(exam.courseCode ?? "").trim() &&
    String(exam.date ?? "").trim() &&
    String(exam.time ?? "").trim() &&
    String(exam.location ?? "").trim()
  );
}

function createExamId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `exam-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildExamTimestamp(date, time) {
  return new Date(`${date}T${time}:00`).getTime();
}

function getCountdownParts(targetMs, nowMs) {
  const remainingMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function formatExamDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatExamTime(value) {
  if (!value) {
    return "";
  }

  const [hours = "00", minutes = "00"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.85,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 22,
      mass: 0.8,
    },
  },
};
