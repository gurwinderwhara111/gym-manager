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
  advance_balance: number;
  member_email: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN");
}

function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
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
  const [viewMode, setViewMode] = useState<"home" | "expiring" | "dues" | "all">("home");

  const [totalCollections, setTotalCollections] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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
    await loadCollections(gymId);
  };

  const loadCollections = async (gymId: string) => {
    const currentMonth = getISTDate().slice(0, 7); // YYYY-MM
    const { data } = await supabase
      .from("payments")
      .select("amount_paid")
      .eq("gym_id", gymId)
      .gte("payment_date", `${currentMonth}-01`)
      .lte("payment_date", `${currentMonth}-31`);

    const total = (data ?? []).reduce((sum, p) => sum + Number(p.amount_paid), 0);
    setTotalCollections(total);
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
    const istToday = getISTDate();

    const advanceBalance = Math.max(0, paid - fee);
    const pendingDue = Math.max(0, fee - paid);

    const { error: memberError } = await supabase.from("members").insert([
      {
        gym_id: gym.id,
        member_name: newMember.member_name.trim(),
        phone_number: newMember.phone_number.trim(),
        category: newMember.category,
        start_date: istToday,
        expiry_date: expiryDate.toISOString().slice(0, 10),
        monthly_fee: fee,
        pending_due: pendingDue,
        advance_balance: advanceBalance,
      },
    ]);

    if (memberError) {
      setStatusMessage(memberError.message);
      return;
    }

    const { data: memberData } = await supabase
      .from("members")
      .select("id")
      .eq("member_name", newMember.member_name.trim())
      .eq("gym_id", gym.id)
      .maybeSingle();

    if (memberData && paid > 0) {
      await supabase.from("payments").insert([
        {
          gym_id: gym.id,
          member_id: memberData.id,
          amount_paid: paid,
          payment_date: istToday,
        },
      ]);
    }

    setNewMember({ member_name: "", phone_number: "", category: "Weight Training", monthly_fee: "0", amount_paid: "0" });
    setStatusMessage("Member added successfully.");
    await loadMembers(gym.id);
  };

  const handleRenew = async (member: Member) => {
    const istToday = getISTDate();
    const currentExpiry = new Date(member.expiry_date);
    const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    let feeToPay = member.monthly_fee;
    let balanceDeduction = 0;
    
    const { data: mData } = await supabase.from("members").select("advance_balance").eq("id", member.id).single();
    const currentAdvance = mData?.advance_balance || 0;
    
    if (currentAdvance > 0) {
      balanceDeduction = Math.min(currentAdvance, feeToPay);
      feeToPay -= balanceDeduction;
    }

    const { error: updateError } = await supabase
      .from("members")
      .update({ 
        expiry_date: newExpiry.toISOString().slice(0, 10),
        advance_balance: currentAdvance - balanceDeduction
      })
      .eq("id", member.id);

    if (updateError) {
      setStatusMessage(updateError.message);
      return;
    }

    await supabase.from("payments").insert([
      {
        gym_id: gym!.id,
        member_id: member.id,
        amount_paid: feeToPay,
        payment_date: istToday,
      },
    ]);

    await loadMembers(gym!.id);
    setStatusMessage(`Renewed ${member.member_name} for 30 days.`);
  };

  const handleClearDue = async (member: Member) => {
    const istToday = getISTDate();
    const amountToClear = member.pending_due;

    if (amountToClear <= 0) return;

    const { error: updateError } = await supabase
      .from("members")
      .update({ pending_due: 0 })
      .eq("id", member.id);

    if (updateError) {
      setStatusMessage(updateError.message);
      return;
    }

    await supabase.from("payments").insert([
      {
        gym_id: gym!.id,
        member_id: member.id,
        amount_paid: amountToClear,
        payment_date: istToday,
      },
    ]);

    await loadMembers(gym!.id);
    setStatusMessage(`Cleared due for ${member.member_name}.`);
  };

  const getWhatsappLink = (member: Member) => {
    const phone = member.phone_number.replace(/\\D/g, "");
    const diff = getDaysBetween(getISTDate(), member.expiry_date);

    let message = "";
    if (member.pending_due > 0) {
      message = `Sat Sri Akal ${member.member_name}, your pending due is ₹${member.pending_due}. Please clear it today.`;
    } else if (diff < 0) {
      message = `Sat Sri Akal ${member.member_name}, your gym subscription expired ${Math.abs(diff)} days ago. Please renew to continue your training.`;
    } else {
      message = `Sat Sri Akal ${member.member_name}, your gym subscription expires in ${diff} days. Please renew to continue.`;
    }
    
    return `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
  };

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
          <div className="cash-header">
            <h2>Current Month Collections: ₹{totalCollections}</h2>
          </div>

          <section className="card">
            <h2>{gym.gym_name} Dashboard</h2>
            <p>Trial day {trialDays + 1} / 14</p>
            
            <div className="tab-group">
              <button 
                className={`tab-btn ${viewMode === "home" ? "active" : ""}`} 
                onClick={() => setViewMode("home")}
              >
                Home
              </button>
              <button 
                className={`tab-btn ${viewMode === "expiring" ? "active" : ""}`} 
                onClick={() => setViewMode("expiring")}
              >
                Expiring Soon
              </button>
              <button 
                className={`tab-btn ${viewMode === "dues" ? "active" : ""}`} 
                onClick={() => setViewMode("dues")}
              >
                Pending Dues
              </button>
              <button 
                className={`tab-btn ${viewMode === "all" ? "active" : ""}`} 
                onClick={() => setViewMode("all")}
              >
                All Members
              </button>
            </div>


            <input 
              type="text" 
              placeholder="Search members..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: "20px" }}
            />

            <div className="member-list">
              {viewMode === "home" && (
                <div className="home-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div className="card" style={{ margin: 0, textAlign: 'center', padding: '15px' }}>
                    <p className="small-text">Total Members</p>
                    <h2 style={{ margin: 0 }}>{members.length}</h2>
                  </div>
                  <div className="card" style={{ margin: 0, textAlign: 'center', padding: '15px' }}>
                    <p className="small-text">Active Now</p>
                    <h2 style={{ margin: 0, color: 'green' }}>
                      {members.filter(m => new Date(m.expiry_date) >= new Date(getISTDate())).length}
                    </h2>
                  </div>
                  <div className="card" style={{ margin: 0, textAlign: 'center', padding: '15px' }}>
                    <p className="small-text">Expired</p>
                    <h2 style={{ margin: 0, color: 'red' }}>
                      {members.filter(m => new Date(m.expiry_date) < new Date(getISTDate())).length}
                    </h2>
                  </div>
                  <div className="card" style={{ margin: 0, textAlign: 'center', padding: '15px' }}>
                    <p className="small-text">Pending Dues</p>
                    <h2 style={{ margin: 0, color: 'orange' }}>
                      {members.filter(m => m.pending_due > 0).length}
                    </h2>
                  </div>
                </div>
              )}

              {viewMode === "all" && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Expiry</th>
                        <th>Due</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members
                        .filter(m => m.member_name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((member) => (
                          <tr key={member.id}>
                            <td>{member.member_name}</td>
                            <td>{formatDate(member.expiry_date)}</td>
                            <td>₹{member.pending_due}</td>
                            <td>
                              <button 
                                onClick={() => handleRenew(member)} 
                                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                              >
                                Renew
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {viewMode === "expiring" || viewMode === "dues" ? (
                members
                  .filter(m => {
                    const days = getDaysBetween(getISTDate(), m.expiry_date);
                    if (viewMode === "expiring") return days <= 5 && m.member_name.toLowerCase().includes(searchQuery.toLowerCase());
                    if (viewMode === "dues") return m.pending_due > 0 && m.member_name.toLowerCase().includes(searchQuery.toLowerCase());
                    return false;
                  })
                  .map((member) => {
                    const days = getDaysBetween(getISTDate(), member.expiry_date);
                    return (
                      <div key={member.id} className="member-card">
                        <div className="member-card-top">
                          <div className="member-info">
                            <h4>{member.member_name}</h4>
                            <span className="category-tag">{member.category}</span>
                          </div>
                          <div className="action-zone">
                            <a href={getWhatsappLink(member)} target="_blank" rel="noreferrer" className="wa-btn">
                              WhatsApp
                            </a>
                            {viewMode === "expiring" ? (
                              <button className="renew-btn" onClick={() => handleRenew(member)}>Renew</button>
                            ) : (
                              <button className="renew-btn" onClick={() => handleClearDue(member)}>Clear Due</button>
                            )}
                          </div>
                        </div>
                        <div className="member-card-bottom">
                          <span className="problem-text">
                            {viewMode === "expiring" 
                              ? (days < 0 ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`) 
                              : `Due: ₹${member.pending_due}`}
                          </span>
                        </div>
                      </div>
                    );
                  })
              ) : null}
              
              { (viewMode === "expiring" || viewMode === "dues") && members.filter(m => {
                  const days = getDaysBetween(getISTDate(), m.expiry_date);
                  if (viewMode === "expiring") return days <= 5 && m.member_name.toLowerCase().includes(searchQuery.toLowerCase());
                  if (viewMode === "dues") return m.pending_due > 0 && m.member_name.toLowerCase().includes(searchQuery.toLowerCase());
                  return false;
                }).length === 0 && <p className="small-text" style={{textAlign: 'center'}}>No priority members found.</p>}
            </div>

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
            
            {Number(newMember.monthly_fee) > Number(newMember.amount_paid) && (
              <div className="udhaar-badge" style={{ textAlign: 'center', marginBottom: '15px' }}>
                Pending Udhaar: ₹{Number(newMember.monthly_fee) - Number(newMember.amount_paid)}
              </div>
            )}

            <div className="date-hack">
              <button
                type="button"
                className={startDateMode === "today" ? "active" : ""}
                onClick={() => setStartDateMode("today")}
              >
                Today
              </button>
              <button
                type="button"
                className={startDateMode === "tomorrow" ? "active" : ""}
                onClick={() => setStartDateMode("tomorrow")}
              >
                Tomorrow
              </button>
              <button
                type="button"
                className={startDateMode === "custom" ? "active" : ""}
                onClick={() => setStartDateMode("custom")}
              >
                Custom
              </button>
            </div>
            {startDateMode === "custom" && (
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
              />
            )}
            <button onClick={handleAddMember} style={{ width: '100%' }}>Save Member</button>
          </section>
        </>
      )}
    </main>
  );
}
