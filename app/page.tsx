"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

type Gym = {
  id: string;
  gym_name: string;
  admin_email: string;
  trial_start_date: string;
};

type Member = {
  id: string;
  gym_id: string;
  member_name: string;
  phone_number: string;
  category: string;
  start_date: string;
  expiry_date: string;
  monthly_fee: number;
  pending_due: number;
  member_email: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN");
}

function getDaysBetween(startDate: string, endDate: string) {
  const a = new Date(startDate).setHours(0, 0, 0, 0);
  const b = new Date(endDate).setHours(0, 0, 0, 0);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [magicEmail, setMagicEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [gym, setGym] = useState<Gym | null>(null);
  const [memberProfile, setMemberProfile] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [gymName, setGymName] = useState("");
  const [viewMode, setViewMode] = useState<"expiring" | "dues">("expiring");
  const [newMember, setNewMember] = useState({
    member_name: "",
    phone_number: "",
    category: "Weight Training",
    monthly_fee: "0",
    amount_paid: "0",
  });
  const [startDateMode, setStartDateMode] = useState<"today" | "tomorrow" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState("");


  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.email) {
      setGym(null);
      setMemberProfile(null);
      setMembers([]);
      return;
    }

    loadUserContent(session.user.email);
  }, [session]);

  const loadUserContent = async (email: string) => {
    setLoading(true);
    setStatusMessage("");

    const { data: gymData } = await supabase.from("gyms").select("*").eq("admin_email", email).maybeSingle();

    if (gymData) {
      setGym(gymData as Gym);
      setMemberProfile(null);
      await loadMembers((gymData as Gym).id);
      setLoading(false);
      return;
    }

    const { data: memberData } = await supabase.from("members").select("*").eq("member_email", email).maybeSingle();
    if (memberData) {
      setMemberProfile(memberData as Member);
      setGym(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setGym(null);
    setMemberProfile(null);
    setMembers([]);
    setLoading(false);
  };

  const loadMembers = async (gymId: string) => {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("gym_id", gymId)
      .order("expiry_date", { ascending: true });

    setMembers((data ?? []) as Member[]);
  };

  const handleLogin = async () => {
    if (!magicEmail) {
      setStatusMessage("Enter your email first.");
      return;
    }
    setStatusMessage("Sending login link...");
    const { error } = await supabase.auth.signInWithOtp({ email: magicEmail });
    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Magic link sent. Check your inbox.");
    }
  };

  const handlePasswordSignIn = async () => {
    if (!magicEmail || !password) {
      setStatusMessage("Enter email and password.");
      return;
    }
    setStatusMessage("Signing in with password...");
    const { error } = await supabase.auth.signInWithPassword({
      email: magicEmail,
      password,
    });
    if (error) {
      setStatusMessage(error.message);
    }
  };

  const handleTestOwnerLogin = async () => {
    setMagicEmail("test1@example.com");
    setPassword("test1");
    setStatusMessage("Signing in as test owner...");
    const { error } = await supabase.auth.signInWithPassword({
      email: "test1@example.com",
      password: "test1",
    });
    if (error) {
      setStatusMessage(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setGym(null);
    setMemberProfile(null);
    setMembers([]);
    setGymName("");
    setStatusMessage("Signed out.");
  };

  const handleCreateGym = async () => {
    if (!session?.user?.email) {
      setStatusMessage("You must be logged in to create a gym.");
      return;
    }
    if (!gymName.trim()) {
      setStatusMessage("Enter a gym name.");
      return;
    }

    setStatusMessage("Creating gym...");
    const { error } = await supabase.from("gyms").insert([
      {
        gym_name: gymName.trim(),
        admin_email: session.user.email,
      },
    ]);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setGymName("");
    setStatusMessage("Gym created. Loading dashboard...");
    await loadUserContent(session.user.email);
  };

  const selectedStartDate = useMemo(() => {
    if (startDateMode === "today") {
      return new Date();
    }
    if (startDateMode === "tomorrow") {
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    return new Date(customStartDate || new Date().toISOString().slice(0, 10));
  }, [startDateMode, customStartDate]);

  const handleAddMember = async () => {
    if (!gym) {
      setStatusMessage("Create a gym before adding members.");
      return;
    }

    const paid = Number(newMember.amount_paid || 0);
    const fee = Number(newMember.monthly_fee || 0);

    if (!newMember.member_name.trim() || !newMember.phone_number.trim()) {
      setStatusMessage("Member name and phone are required.");
      return;
    }

    const startDate = selectedStartDate;
    const expiryDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from("members").insert([
      {
        gym_id: gym.id,
        member_name: newMember.member_name.trim(),
        phone_number: newMember.phone_number.trim(),
        category: newMember.category,
        start_date: startDate.toISOString().slice(0, 10),
        expiry_date: expiryDate.toISOString().slice(0, 10),
        monthly_fee: fee,
        pending_due: Math.max(0, fee - paid),
      },
    ]);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setNewMember({ member_name: "", phone_number: "", category: "Weight Training", monthly_fee: "0", amount_paid: "0" });
    setStatusMessage("Member added.");
    await loadMembers(gym.id);
  };

  const handleRenew = async (member: Member) => {
    const currentExpiry = new Date(member.expiry_date);
    const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { error } = await supabase
      .from("members")
      .update({ expiry_date: newExpiry.toISOString().slice(0, 10) })
      .eq("id", member.id);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    await loadMembers(gym!.id);
    setStatusMessage(`Renewed ${member.member_name} for 30 days.`);
  };

  const getWhatsappLink = (member: Member) => {
    const phone = member.phone_number.replace(/\D/g, "");
    const dueMessage = member.pending_due > 0
      ? `Sat Sri Akal ${member.member_name}, your pending due is Rs.${member.pending_due}. Please clear it today.`
      : `Sat Sri Akal ${member.member_name}, your gym subscription expires in ${Math.max(
          0,
          getDaysBetween(new Date().toISOString().slice(0, 10), member.expiry_date)
        )} days. Please renew to continue.`;
    return `https://wa.me/91${phone}?text=${encodeURIComponent(dueMessage)}`;
  };

    const activeMembers = members.filter((m) => {
      return new Date(m.expiry_date) >= new Date(new Date().toISOString().slice(0, 10));
    });
    const expiredMembers = members.filter((m) => {
      return new Date(m.expiry_date) < new Date(new Date().toISOString().slice(0, 10));
    });

    const trialDays = gym
      ? Math.floor((Date.now() - new Date(gym.trial_start_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;



  const trialExpired = gym ? trialDays >= 15 : false;
  const daysLeft = gym ? Math.max(0, 14 - trialDays) : 14;

  return (
    <main className="page-shell">
      {trialExpired && (
        <div className="lockout-overlay">
          <div className="lockout-card">
            <h1>Trial Expired</h1>
            <p>Your free 14-day trial has ended.</p>
            <p>Pay ₹499 via UPI to unlock your dashboard and continue managing your members.</p>
            <div className="upi-box">
              <strong>UPI ID:</strong>
              <p>yourupi@bank</p>
            </div>
            <p className="small-text">After payment, reload the page or contact support to restore access.</p>
          </div>
        </div>
      )}

      <section className={`card ${trialExpired ? "blurred" : ""}`}>
        <h1>Gym Manager</h1>
        <p>Supabase-native local development with auth, multi-tenant RLS, and lockout logic.</p>

        {loading ? (
          <p>Loading...</p>
        ) : !session?.user ? (
          <div className="auth-card">
            <p>Local dev sign-in. Production should use Google OAuth.</p>
            <input
              type="email"
              placeholder="you@example.com"
              value={magicEmail}
              onChange={(event) => setMagicEmail(event.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button onClick={handlePasswordSignIn}>Sign in with password</button>
            <button onClick={handleLogin}>Send magic link</button>
            <button type="button" onClick={handleTestOwnerLogin}>
              Login as test owner
            </button>
            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
                if (error) setStatusMessage(error.message);
              }}
            >
              Sign in with Google
            </button>
            <div className="debug-text">
              Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL} / {process.env.NEXT_PUBLIC_SUPABASE_URL_CODESPACES}
            </div>
          </div>
        ) : (
          <div className="status-bar">
            <p>Signed in as {session.user.email}</p>
            <button className="secondary" onClick={handleSignOut}>Sign out</button>
          </div>
        )}

        {statusMessage && <p className="status-text">{statusMessage}</p>}
      </section>

      {!loading && session?.user && !gym && !memberProfile && (
        <section className={`card ${trialExpired ? "blurred" : ""}`}>
          <h2>Set up your gym</h2>
          <p>Enter your gym name to start tracking members and payments.</p>
          <input
            type="text"
            placeholder="Gym name"
            value={gymName}
            onChange={(event) => setGymName(event.target.value)}
          />
          <button onClick={handleCreateGym}>Create gym</button>
        </section>
      )}

      {memberProfile && (
        <section className="card">
          <h2>Member Portal</h2>
          <p>{memberProfile.member_name}</p>
          <p>Category: {memberProfile.category}</p>
          <p>Expiry: {formatDate(memberProfile.expiry_date)}</p>
          <p>Pending due: ₹{memberProfile.pending_due}</p>
          <p>{getDaysBetween(new Date().toISOString().slice(0, 10), memberProfile.expiry_date)} days left</p>
        </section>
      )}

      {gym && !trialExpired && (
        <>
          <section className="card">
            <h2>{gym.gym_name} Dashboard</h2>
            <p>Trial day {trialDays + 1} / 14</p>
            <p>Total members: {members.length}</p>
            <p>Next expiration: {members.filter((m) => getDaysBetween(new Date().toISOString().slice(0, 10), m.expiry_date) <= 5).length}</p>
          </section>

          <section className="card">
            <h2>Add Member</h2>
            <div className="form-row">
              <input
                type="text"
                placeholder="Member name"
                value={newMember.member_name}
                onChange={(event) => setNewMember({ ...newMember, member_name: event.target.value })}
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={newMember.phone_number}
                onChange={(event) => setNewMember({ ...newMember, phone_number: event.target.value })}
              />
            </div>
            <div className="form-row">
              <select
                value={newMember.category}
                onChange={(event) => setNewMember({ ...newMember, category: event.target.value })}
              >
                <option>Weight Training</option>
                <option>Cardio</option>
                <option>Zumba</option>
              </select>
              <input
                type="number"
                placeholder="Total fee"
                value={newMember.monthly_fee}
                onChange={(event) => setNewMember({ ...newMember, monthly_fee: event.target.value })}
              />
              <input
                type="number"
                placeholder="Paid today"
                value={newMember.amount_paid}
                onChange={(event) => setNewMember({ ...newMember, amount_paid: event.target.value })}
              />
            </div>
            <div className="button-row">
              <button
                type="button"
                className={startDateMode === "today" ? "active" : ""}
                onClick={() => setStartDateMode("today")}
              >
                Starts Today
              </button>
              <button
                type="button"
                className={startDateMode === "tomorrow" ? "active" : ""}
                onClick={() => setStartDateMode("tomorrow")}
              >
                Starts Tomorrow
              </button>
              <button
                type="button"
                className={startDateMode === "custom" ? "active" : ""}
                onClick={() => setStartDateMode("custom")}
              >
                Custom Date
              </button>
            </div>
            {startDateMode === "custom" && (
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
              />
            )}
            <button onClick={handleAddMember}>Save member</button>
          </section>

           <section className="card">
             <h2>Membership Status</h2>
             <div style={{ marginBottom: "30px" }}>
               <h3 style={{ color: "green" }}>✅ Currently Running (Active)</h3>
               {activeMembers.length === 0 ? (
                 <p className="small-text">No active members.</p>
               ) : (
                 <table>
                   <thead>
                     <tr>
                       <th>Name</th>
                       <th>Phone</th>
                       <th>Expiry</th>
                       <th>Action</th>
                     </tr>
                   </thead>
                   <tbody>
                     {activeMembers.map((member) => (
                       <tr key={member.id}>
                         <td>{member.member_name}</td>
                         <td>{member.phone_number}</td>
                         <td>{formatDate(member.expiry_date)}</td>
                         <td className="member-actions">
                           <button onClick={() => handleRenew(member)}>Renew</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
             </div>

             <div>
               <h3 style={{ color: "red" }}>❌ Out of Subscription (Expired)</h3>
               {expiredMembers.length === 0 ? (
                 <p className="small-text">No expired members.</p>
               ) : (
                 <table>
                   <thead>
                     <tr>
                       <th>Name</th>
                       <th>Phone</th>
                       <th>Expiry</th>
                       <th>Action</th>
                     </tr>
                   </thead>
                   <tbody>
                     {expiredMembers.map((member) => (
                       <tr key={member.id}>
                         <td>{member.member_name}</td>
                         <td>{member.phone_number}</td>
                         <td>{formatDate(member.expiry_date)}</td>
                         <td className="member-actions">
                           <button onClick={() => handleRenew(member)}>Renew</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
             </div>
           </section>


        </>
      )}
    </main>
  );
}
