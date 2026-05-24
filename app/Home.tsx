"use client";

import React, { useEffect, useMemo, useState } from "react";
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

type Payment = {
  id: string;
  gym_id: string;
  member_id: string;
  amount_paid: number;
  payment_date: string;
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
  const [statusMessage, setStatusMessage] = useState("");
  const [gym, setGym] = useState<Gym | null>(null);
  const [memberProfile, setMemberProfile] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [gymName, setGymName] = useState("");
  const [activeTab, setActiveTab] = useState<"urgent" | "all">("urgent");
  const [totalCollections, setTotalCollections] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSheet, setShowMobileSheet] = useState(false);
 
  // --- Basement Mode (Offline Support) ---
  const saveToOfflineQueue = (memberData: any) => {
    const queue = JSON.parse(localStorage.getItem("offline_members_queue") || "[]");
    queue.push({ ...memberData, timestamp: Date.now() });
    localStorage.setItem("offline_members_queue", JSON.stringify(queue));
  };
 
  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem("offline_members_queue") || "[]");
    if (queue.length === 0) return;
 
    setStatusMessage(`Syncing ${queue.length} members...`);
    const remainingQueue = [];
 
    for (const item of queue) {
      try {
        const { error, data } = await supabase.from("members").insert([item]).select();
        if (error) {
          remainingQueue.push(item);
          console.error("Sync error:", error);
        } else if (data && data.length > 0) {
          // Also log payment if amount_paid > 0
          const amountPaid = item.monthly_fee - item.pending_due; // Simplified logic
          if (amountPaid > 0) {
            await supabase.from("payments").insert([
              {
                gym_id: item.gym_id,
                member_id: data[0].id,
                amount_paid: amountPaid,
                payment_date: getISTDate(),
              },
            ]);
          }
        }
      } catch (e) {
        remainingQueue.push(item);
      }
    }
 
    localStorage.setItem("offline_members_queue", JSON.stringify(remainingQueue));
    setStatusMessage(remainingQueue.length === 0 ? "All members synced!" : `Synced ${queue.length - remainingQueue.length} members.`);
    if (gym) await loadMembers(gym.id);
  };
 
  useEffect(() => {
    window.addEventListener("online", syncOfflineQueue);
    return () => window.removeEventListener("online", syncOfflineQueue);
  }, [gym]);
  // ---------------------------------------
 
  const [newMember, setNewMember] = useState({
    member_name: "",
    phone_number: "",
    category: "Weight Training",
    monthly_fee: "",
    amount_paid: "",
  });
  const [startDateMode, setStartDateMode] = useState<"today" | "tomorrow" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const loadUserContent = async (email: string) => {
    setLoading(true);
    setStatusMessage("");

    try {
      const { data: gymData } = await supabase.from("gyms").select("*").eq("admin_email", email).maybeSingle();

      if (gymData) {
        setGym(gymData as Gym);
        setMemberProfile(null);
        await loadMembers((gymData as Gym).id);
        return;
      }

      const { data: memberData } = await supabase.from("members").select("*").eq("member_email", email).maybeSingle();
      if (memberData) {
        setMemberProfile(memberData as Member);
        setGym(null);
        setMembers([]);
        return;
      }

      setGym(null);
      setMemberProfile(null);
      setMembers([]);
    } catch (error) {
      console.error("Loading user content failed:", error);
      setStatusMessage("Error loading profile.");
    } finally {
      setLoading(false);
    }
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
    const currentMonth = getISTDate().slice(0, 7);
    const { data } = await supabase
      .from("payments")
      .select("amount_paid")
      .eq("gym_id", gymId)
      .gte("payment_date", `${currentMonth}-01`)
      .lte("payment_date", `${currentMonth}-31`);

    const total = (data ?? []).reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0);
    setTotalCollections(total);
  };

  const handleGoogleSignIn = async () => {
    setStatusMessage("Redirecting to Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
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
    setStatusMessage("Gym created successfully!");
    await loadUserContent(session.user.email);
  };

  const handleAddMember = async () => {
    if (!gym) {
      setStatusMessage("Create a gym before adding members.");
      return;
    }

    const paid = parseFloat(newMember.amount_paid || "0");
    const fee = parseFloat(newMember.monthly_fee || "0");

    if (!newMember.member_name.trim() || !newMember.phone_number.trim()) {
      setStatusMessage("Member name and phone are required.");
      return;
    }

    if (fee <= 0) {
      setStatusMessage("Monthly fee must be greater than 0.");
      return;
    }

    const startDate = selectedStartDate;
    const expiryDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const istToday = getISTDate();

    const advanceBalance = Math.max(0, paid - fee);
    const pendingDue = Math.max(0, fee - paid);

    const { error: memberError, data: insertedData } = await supabase.from("members").insert([
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
    ]).select();
 
    if (memberError) {
      // Check if it's a network error
      if (!navigator.onLine) {
        saveToOfflineQueue({
          gym_id: gym.id,
          member_name: newMember.member_name.trim(),
          phone_number: newMember.phone_number.trim(),
          category: newMember.category,
          start_date: istToday,
          expiry_date: expiryDate.toISOString().slice(0, 10),
          monthly_fee: fee,
          pending_due: pendingDue,
          advance_balance: advanceBalance,
        });
        setStatusMessage("Saved offline! Will sync when connection returns.");
        setNewMember({ member_name: "", phone_number: "", category: "Weight Training", monthly_fee: "", amount_paid: "" });
        setShowMobileSheet(false);
        // Manually add to members state to provide instant feedback
        setMembers(prev => [{
          id: 'offline-' + Date.now(),
          gym_id: gym.id,
          member_name: newMember.member_name.trim(),
          phone_number: newMember.phone_number.trim(),
          category: newMember.category,
          start_date: istToday,
          expiry_date: expiryDate.toISOString().slice(0, 10),
          monthly_fee: fee,
          pending_due: pendingDue,
          advance_balance: advanceBalance,
          member_email: null
        }, ...prev]);
        return;
      }
      setStatusMessage(memberError.message);
      return;
    }

    if (paid > 0 && insertedData && insertedData.length > 0) {
      await supabase.from("payments").insert([
        {
          gym_id: gym.id,
          member_id: insertedData[0].id,
          amount_paid: paid,
          payment_date: istToday,
        },
      ]);
    }

    setNewMember({ member_name: "", phone_number: "", category: "Weight Training", monthly_fee: "", amount_paid: "" });
    setCustomStartDate("");
    setStartDateMode("today");
    setShowMobileSheet(false);
    setStatusMessage("Member added successfully!");
    await loadMembers(gym.id);
  };

  const handleRenew = async (member: Member) => {
    if (!gym) return;
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
        advance_balance: currentAdvance - balanceDeduction,
      })
      .eq("id", member.id);

    if (updateError) {
      setStatusMessage(updateError.message);
      return;
    }

    if (feeToPay > 0) {
      await supabase.from("payments").insert([
        {
          gym_id: gym.id,
          member_id: member.id,
          amount_paid: feeToPay,
          payment_date: istToday,
        },
      ]);
    }

    await loadMembers(gym.id);
    setStatusMessage(`✓ Renewed ${member.member_name} for 30 days.`);
  };

  const handleClearDue = async (member: Member) => {
    if (!gym) return;
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
        gym_id: gym.id,
        member_id: member.id,
        amount_paid: amountToClear,
        payment_date: istToday,
      },
    ]);

    await loadMembers(gym.id);
    setStatusMessage(`✓ Cleared ₹${amountToClear} due for ${member.member_name}.`);
  };

  const getWhatsappLink = (member: Member) => {
    const phone = member.phone_number.replace(/\D/g, "");
    const diff = getDaysBetween(getISTDate(), member.expiry_date);

    let message = "";
    if (member.pending_due > 0) {
      message = `Hi ${member.member_name}, your pending due is ₹${member.pending_due}. Please clear it to continue your membership.`;
    } else if (diff < 0) {
      message = `Hi ${member.member_name}, your gym subscription expired ${Math.abs(diff)} days ago. Please renew now to continue training.`;
    } else {
      message = `Hi ${member.member_name}, your subscription expires in ${diff} days. Renew now to avoid interruption!`;
    }

    return `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleExportData = () => {
    if (!members || members.length === 0) {
      setStatusMessage("No members to export.");
      return;
    }

    const headers = ["Name", "Phone", "Category", "Start Date", "Expiry Date", "Monthly Fee", "Pending Due"];
    const csvRows = members.map((member) => [
      `"${member.member_name}"`,
      member.phone_number,
      member.category,
      formatDate(member.start_date),
      formatDate(member.expiry_date),
      member.monthly_fee,
      member.pending_due,
    ]);

    const csvContent = "\uFEFF" + [headers, ...csvRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${gym?.gym_name.replace(/\s+/g, "_") || "Gym"}_Members.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatusMessage("✓ Backup downloaded!");
  };

  const calculateUdhaar = () => {
    const fee = parseFloat(newMember.monthly_fee || "0");
    const paid = parseFloat(newMember.amount_paid || "0");
    return Math.max(0, fee - paid);
  };

  const selectedStartDate = useMemo(() => {
    if (startDateMode === "today") {
      return new Date();
    }
    if (startDateMode === "tomorrow") {
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    return customStartDate ? new Date(customStartDate) : new Date();
  }, [startDateMode, customStartDate]);

  const trialDays = gym ? Math.floor((Date.now() - new Date(gym.trial_start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const trialExpired = gym ? trialDays >= 15 : false;
  const daysLeft = gym ? Math.max(0, 14 - trialDays) : 14;
 
  if (trialExpired) {
    return (
      <div className="fixed inset-0 z-[100] bg-dark-950 flex items-center justify-center p-5 text-center">
        <div className="max-w-md w-full bg-dark-900 border border-white/10 rounded-[32px] p-8 shadow-2xl">
          <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-3">Trial Expired</h2>
          <p className="text-neutral-400 font-semibold mb-8">
            Your 14-day free trial has ended. Pay ₹499 to unlock your dashboard and continue managing your members.
          </p>
          
          <div className="bg-white p-4 rounded-3xl inline-block mb-8 shadow-inner">
            {/* Placeholder for UPI QR Code */}
            <div className="w-48 h-48 bg-neutral-200 flex items-center justify-center text-neutral-500 font-bold text-xs text-center p-4">
              UPI QR CODE<br/>(Payment Gateway)
            </div>
          </div>
          
          <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-6">
            Scan to pay via UPI
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-brand-500 hover:bg-brand-400 text-black font-black py-4 rounded-2xl transition-all"
          >
            I Have Paid - Unlock Now
          </button>
        </div>
      </div>
    );
  }
 
  const expiringMembers = members.filter((m) => {
    const days = getDaysBetween(getISTDate(), m.expiry_date);
    return days <= 5 && days >= 0;
  });

  const expiredMembers = members.filter((m) => {
    const days = getDaysBetween(getISTDate(), m.expiry_date);
    return days < 0;
  });

  const pendingDuesMembers = members.filter((m) => m.pending_due > 0);
  const totalPendingDues = pendingDuesMembers.reduce((sum, m) => sum + m.pending_due, 0);

  const activeMembers = members.filter((m) => new Date(m.expiry_date) >= new Date(getISTDate()));

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setStatusMessage("Authentication error. Please refresh.");
      } finally {
        setLoading(false);
      }
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

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-neutral-200 border-t-brand-500 animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-500 font-bold">Loading...</p>
        </div>
      </div>
    );
  }
 
  if (!session?.user) {
    return (
      <section className="min-h-screen bg-neutral-50 flex items-center justify-center p-5">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <span className="text-white font-black text-3xl">💪</span>
            </div>
            <h1 className="text-3xl font-black text-neutral-900 mb-2">Gym Manager</h1>
            <p className="text-neutral-500 font-semibold">Enterprise member dashboard</p>
          </div>
 
          <div className="bg-white border border-neutral-200 rounded-3xl p-8 space-y-5 mb-6 shadow-sm">
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 font-bold rounded-2xl px-4 py-4 outline-none focus:border-brand-500 transition-colors"
              />
            </div>
 
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-white hover:bg-neutral-100 text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 border border-neutral-200 shadow-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign In with Google
            </button>
 
            {statusMessage && (
              <div className="bg-neutral-100 border border-neutral-200 rounded-2xl p-4 text-center text-neutral-600 text-sm font-semibold">
                {statusMessage}
              </div>
            )}
 
            <p className="text-center text-neutral-500 text-xs font-semibold mt-8">Enterprise Gym Management System</p>
          </div>
        </div>
      </section>
    );
  }

  if (!session?.user) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center p-5">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <span className="text-white font-black text-3xl">💪</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Gym Manager</h1>
            <p className="text-neutral-400 font-semibold">Enterprise member dashboard</p>
          </div>

           <div className="bg-dark-900 border border-white/5 rounded-3xl p-8 space-y-5 mb-6">
             <div className="space-y-4">
               <input
                 type="email"
                 placeholder="Email address"
                 value={magicEmail}
                 onChange={(e) => setMagicEmail(e.target.value)}
                 className="w-full bg-dark-800 border border-white/10 text-white font-bold rounded-2xl px-4 py-4 outline-none focus:border-brand-500 transition-colors"
               />
             </div>
 
             <button
               onClick={handleGoogleSignIn}
               className="w-full bg-white hover:bg-neutral-200 text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3"
             >
               <svg width="20" height="20" viewBox="0 0 24 24">
                 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
               </svg>
               Sign In with Google
             </button>
 
             {statusMessage && (
               <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 text-center text-neutral-300 text-sm font-semibold">
                 {statusMessage}
               </div>
             )}
 
             <p className="text-center text-neutral-500 text-xs font-semibold mt-8">Enterprise Gym Management System</p>
           </div>
         </div>
       </section>
     );
   }

  if (!gym && !memberProfile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-5">
        <div className="max-w-md w-full">
          <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm">
            <h2 className="text-2xl font-black text-neutral-900 mb-4 flex items-center gap-2">
              <span>🏋️</span> Create Your Gym
            </h2>
            <p className="text-neutral-500 font-semibold mb-6">Enter your gym name to start tracking members and payments.</p>
 
            <input
              type="text"
              placeholder="Your Gym Name"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 font-bold rounded-2xl px-4 py-4 outline-none focus:border-brand-500 transition-colors mb-5"
            />
 
            <button
              onClick={handleCreateGym}
              className="w-full bg-brand-500 hover:bg-brand-400 text-black font-black py-4 rounded-2xl transition-all shadow-md mb-4"
            >
              Create Gym
            </button>
 
            <button
              onClick={handleSignOut}
              className="w-full bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-600 font-bold py-3 rounded-2xl transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (memberProfile) {
    return (
      <div className="min-h-screen bg-neutral-50 p-5 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 sticky top-0 z-40 border-b border-neutral-200 rounded-2xl mb-6 p-6 backdrop-blur-md">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl lg:text-3xl font-black text-neutral-900">Member Portal</h1>
                <p className="text-neutral-500 font-semibold text-sm mt-1">{session.user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold py-2.5 px-4 rounded-full transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest mb-2">Your Name</p>
              <h3 className="text-2xl font-black text-neutral-900">{memberProfile.member_name}</h3>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest mb-2">Category</p>
              <h3 className="text-2xl font-black text-brand-500">{memberProfile.category}</h3>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest mb-2">Expires On</p>
              <h3 className="text-2xl font-black text-neutral-900">{formatDate(memberProfile.expiry_date)}</h3>
            </div>
            <div className={`rounded-2xl p-6 border ${memberProfile.pending_due > 0 ? "bg-orange-500/10 border-orange-500/20" : "bg-green-500/10 border-green-500/20"}`}>
              <p className={`font-bold text-xs uppercase tracking-widest mb-2 ${memberProfile.pending_due > 0 ? "text-orange-600" : "text-green-600"}`}>
                {memberProfile.pending_due > 0 ? "Pending Due" : "Paid Up"}
              </p>
              <h3 className={`text-2xl font-black ${memberProfile.pending_due > 0 ? "text-orange-600" : "text-green-600"}`}>
                ₹{memberProfile.pending_due}
              </h3>
            </div>
          </div>
 
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm text-center">
            <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest mb-6">Membership Status</p>
            <div className="relative w-48 h-48 mx-auto mb-6">
              {/* Circular Ring */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-neutral-100"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 * (1 - Math.min(1, Math.max(0, getDaysBetween(getISTDate(), memberProfile.expiry_date) / 30)))}
                  strokeLinecap="round"
                  className={`${
                    getDaysBetween(getISTDate(), memberProfile.expiry_date) < 0 ? "text-rose-500" : 
                    getDaysBetween(getISTDate(), memberProfile.expiry_date) <= 5 ? "text-orange-500" : "text-brand-500"
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-neutral-900">
                  {Math.max(0, getDaysBetween(getISTDate(), memberProfile.expiry_date))}
                </span>
                <span className="text-neutral-500 font-bold text-xs uppercase">Days Left</span>
              </div>
            </div>
            
            <div className={`inline-block px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest ${
              getDaysBetween(getISTDate(), memberProfile.expiry_date) < 0 ? "bg-rose-500/20 text-rose-500" : 
              getDaysBetween(getISTDate(), memberProfile.expiry_date) <= 5 ? "bg-orange-500/20 text-orange-500" : "bg-green-500/20 text-green-500"
            }`}>
              {getDaysBetween(getISTDate(), memberProfile.expiry_date) < 0 ? "Expired" : 
               getDaysBetween(getISTDate(), memberProfile.expiry_date) <= 5 ? "Expiring Soon" : "Active"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-smooth">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-white/10 w-full">
        <div className="max-w-7xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-brand-500 flex items-center justify-center text-black font-black text-lg lg:text-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              💪
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight leading-none text-white">{gym?.gym_name}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                <p className="text-[10px] lg:text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                  Day {trialDays + 1}/14 Trial
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportData}
              className="hidden md:flex px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-white/10 text-neutral-300 text-sm font-bold rounded-xl transition-all items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export
            </button>
            <button
              onClick={handleSignOut}
              className="w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-full md:rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 flex items-center justify-center text-sm font-bold transition-all"
            >
              <span className="hidden md:block">Sign Out</span>
              <svg className="md:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto w-full px-5 py-6 flex-1 lg:grid lg:grid-cols-12 lg:gap-8 pb-32 lg:pb-8">
        {/* Left Column: Dashboard */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          {/* Dashboard Stats Grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Main Cash Box */}
            <div className="col-span-2 xl:col-span-2 bg-gradient-to-br from-brand-400 to-brand-600 rounded-[28px] p-6 lg:p-8 shadow-[0_8px_30px_rgba(16,185,129,0.15)] relative overflow-hidden flex flex-col justify-between group">
              <svg
                className="absolute -right-6 -bottom-6 opacity-20 w-40 h-40 transform group-hover:scale-110 transition-transform duration-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="black"
                strokeWidth="2"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <p className="text-emerald-950 font-black text-[11px] uppercase tracking-widest mb-2 relative z-10">Monthly Collection</p>
              <h2 className="text-black text-5xl lg:text-6xl font-black tracking-tighter relative z-10">₹{totalCollections.toLocaleString("en-IN")}</h2>
              <div className="mt-6 flex items-center gap-2 bg-black/10 w-max px-3 py-1.5 rounded-full backdrop-blur-md relative z-10">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                <span className="text-black font-bold text-xs">Active tracking</span>
              </div>
            </div>

            {/* Expiring Stats */}
            <div className="col-span-1 bg-dark-800 border border-white/5 rounded-[28px] p-6 flex flex-col justify-between hover:bg-dark-700 transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div>
                 <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1">Expiring {`< 5 Days`}</p>
                <h3 className="text-3xl font-black text-white">{expiringMembers.length}</h3>
              </div>
            </div>

            {/* Udhaar Stats */}
            <div className="col-span-1 bg-dark-800 border border-white/5 rounded-[28px] p-6 flex flex-col justify-between hover:bg-dark-700 transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div>
                <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Pending</p>
                <h3 className="text-3xl font-black text-orange-500">₹{totalPendingDues.toLocaleString("en-IN")}</h3>
              </div>
            </div>
          </div>

          {/* Search and Tabs */}
          <div className="mt-2">
            {/* Search */}
            <div className="relative mb-5 group">
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-brand-500 transition-colors" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="search"
                placeholder="Search members by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 text-white font-bold rounded-[20px] pl-12 pr-5 py-4 outline-none focus:border-brand-500 focus:bg-dark-800 transition-all shadow-inner"
              />
            </div>

            {/* Tabs */}
            <div className="flex bg-dark-900 p-1.5 rounded-2xl mb-6 border border-white/5">
              <button
                onClick={() => {
                  setActiveTab("urgent");
                  setSearchQuery("");
                }}
                id="tab-urgent"
                className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                  activeTab === "urgent"
                    ? "bg-dark-700 text-white shadow-md border border-white/10"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                Action Required ({expiringMembers.length + expiredMembers.length + pendingDuesMembers.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab("all");
                  setSearchQuery("");
                }}
                id="tab-all"
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "all" ? "bg-dark-700 text-white shadow-md border border-white/10" : "text-neutral-500 hover:text-white"
                }`}
              >
                All Members ({members.length})
              </button>
            </div>

            {/* Content - Urgent (Action Required) */}
            {activeTab === "urgent" && (
              <div id="content-urgent" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Expiring Members */}
                {expiringMembers.map((member) => {
                  const days = getDaysBetween(getISTDate(), member.expiry_date);
                  return (
                    <div
                      key={member.id}
                      className="bg-dark-900 border border-white/5 rounded-[24px] p-5 lg:p-6 relative overflow-hidden group hover:border-rose-500/30 transition-colors"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]"></div>
                      <div className="flex justify-between items-start mb-5">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-full bg-dark-800 border border-white/10 flex items-center justify-center text-white font-black text-xl shadow-inner">
                            {member.member_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-white leading-none mb-1.5">{member.member_name}</h4>
                            <span className="text-neutral-400 font-bold text-xs uppercase tracking-wider">{member.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black text-xs px-3 py-1.5 rounded-lg uppercase tracking-widest inline-block mb-5">
                        {days === 0 ? "Expires Today" : `Expires in ${days} day${days > 1 ? "s" : ""}`}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href={getWhatsappLink(member)}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#1e1e1e] border border-[#25D366]/30 text-[#25D366] font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-all hover:bg-[#25D366]/10 text-sm"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                          </svg>
                          Remind
                        </a>
                        <button onClick={() => handleRenew(member)} className="bg-white text-black font-black py-3.5 rounded-xl active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:bg-neutral-200 text-sm">
                          Renew +30
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Expired Members */}
                {expiredMembers.map((member) => {
                  const days = getDaysBetween(getISTDate(), member.expiry_date);
                  return (
                    <div
                      key={member.id}
                      className="bg-dark-900 border border-white/5 rounded-[24px] p-5 lg:p-6 relative overflow-hidden group hover:border-red-500/30 transition-colors"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                      <div className="flex justify-between items-start mb-5">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-full bg-dark-800 border border-white/10 flex items-center justify-center text-white font-black text-xl shadow-inner">
                            {member.member_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-white leading-none mb-1.5">{member.member_name}</h4>
                            <span className="text-neutral-400 font-bold text-xs uppercase tracking-wider">{member.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 text-red-500 font-black text-xs px-3 py-1.5 rounded-lg uppercase tracking-widest inline-block mb-5">
                        {`Expired ${Math.abs(days)} day${Math.abs(days) > 1 ? "s" : ""} ago`}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href={getWhatsappLink(member)}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#1e1e1e] border border-[#25D366]/30 text-[#25D366] font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-all hover:bg-[#25D366]/10 text-sm"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                          </svg>
                          Remind
                        </a>
                        <button onClick={() => handleRenew(member)} className="bg-white text-black font-black py-3.5 rounded-xl active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:bg-neutral-200 text-sm">
                          Renew +30
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Pending Dues */}
                {pendingDuesMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-dark-900 border border-white/5 rounded-[24px] p-5 lg:p-6 relative overflow-hidden group hover:border-orange-500/30 transition-colors"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"></div>
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-full bg-dark-800 border border-white/10 flex items-center justify-center text-white font-black text-xl shadow-inner">
                          {member.member_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-white leading-none mb-1.5">{member.member_name}</h4>
                          <span className="text-neutral-400 font-bold text-xs uppercase tracking-wider">{member.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 font-black text-xs px-3 py-1.5 rounded-lg uppercase tracking-widest inline-block mb-5">
                      Udhaar: ₹{member.pending_due.toLocaleString("en-IN")}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href={getWhatsappLink(member)}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[#1e1e1e] border border-[#25D366]/30 text-[#25D366] font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-all hover:bg-[#25D366]/10 text-sm"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                        Ask
                      </a>
                      <button onClick={() => handleClearDue(member)} className="bg-brand-500 text-black font-black py-3.5 rounded-xl active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:bg-brand-400 text-sm">
                        Clear Dues
                      </button>
                    </div>
                  </div>
                ))}

                {expiringMembers.length === 0 && expiredMembers.length === 0 && pendingDuesMembers.length === 0 && (
                  <div className="col-span-2 h-32 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-600 mb-3">
                      <path d="M9 12l2 2 4-4" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                    <p className="text-neutral-500 text-sm font-semibold">All members are up to date!</p>
                  </div>
                )}
              </div>
            )}

            {/* Content - All Members */}
            {activeTab === "all" && (
              <div id="content-all" className="space-y-4">
                {members.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                    <p className="text-neutral-500 text-sm font-semibold">No members yet. Add one using the form on the right!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members
                      .filter((m) => m.member_name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((member) => {
                        const daysLeft = getDaysBetween(getISTDate(), member.expiry_date);
                        const isExpired = daysLeft < 0;
                        const isExpiring = daysLeft >= 0 && daysLeft <= 5;

                        return (
                          <div
                            key={member.id}
                            className={`bg-dark-900 border rounded-[20px] p-5 flex justify-between items-center transition-colors ${
                              isExpired ? "border-red-500/20 hover:border-red-500/40" : isExpiring ? "border-rose-500/20 hover:border-rose-500/40" : member.pending_due > 0 ? "border-orange-500/20 hover:border-orange-500/40" : "border-white/5 hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg ${isExpired ? "bg-red-500/20" : isExpiring ? "bg-rose-500/20" : member.pending_due > 0 ? "bg-orange-500/20" : "bg-brand-500/20"}`}>
                                {member.member_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-black text-white truncate">{member.member_name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-neutral-400 text-xs font-bold">{member.category}</span>
                                  {member.pending_due > 0 && <span className="text-orange-400 text-xs font-black bg-orange-500/20 px-2 py-1 rounded">₹{member.pending_due}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="text-right min-w-fit">
                              <p className={`font-black text-sm ${isExpired ? "text-red-500" : isExpiring ? "text-rose-500" : "text-white"}`}>
                                {isExpired ? `Exp ${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                              </p>
                              <p className="text-neutral-400 text-xs font-bold">{formatDate(member.expiry_date)}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Add Member Sidebar */}
        <div id="overlay" onClick={() => setShowMobileSheet(false)} className={`lg:hidden fixed inset-0 bg-black/80 z-40 backdrop-blur-sm transition-opacity ${showMobileSheet ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}></div>

        <div
          id="actionSidebar"
          className={`fixed inset-x-0 bottom-0 z-50 lg:z-10 lg:static lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none transition-transform lg:transition-none ${
            showMobileSheet ? "transform translate-y-0" : "transform translate-y-full lg:translate-y-0"
          }`}
        >
          <div className="bg-dark-900 lg:bg-dark-900/50 lg:border lg:border-white/5 rounded-t-[32px] lg:rounded-[32px] lg:sticky lg:top-24 flex flex-col h-[85vh] lg:h-auto shadow-[0_-15px_40px_rgba(0,0,0,0.5)] lg:shadow-none">
            {/* Form Header */}
            <div className="p-6 pb-4 flex justify-between items-center border-b border-white/5 relative">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full lg:hidden"></div>
              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <svg className="text-brand-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
                Quick Add
              </h3>
              <button onClick={() => setShowMobileSheet(false)} className="lg:hidden w-8 h-8 bg-dark-800 rounded-full flex items-center justify-center text-neutral-400 active:scale-90 transition-transform">
                ✕
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 overflow-y-auto no-scrollbar space-y-5 pb-12 lg:pb-6">
              <div className="space-y-4">
                {/* Name */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-4 bg-dark-900 lg:bg-dark-900/50 px-1.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest z-10">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newMember.member_name}
                    onChange={(e) => setNewMember({ ...newMember, member_name: e.target.value })}
                    className="w-full bg-dark-800 border border-white/10 text-white font-bold rounded-2xl px-4 py-4 outline-none focus:border-brand-500 transition-colors shadow-inner"
                  />
                </div>

                {/* Phone */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-4 bg-dark-900 lg:bg-dark-900/50 px-1.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest z-10">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={newMember.phone_number}
                    onChange={(e) => setNewMember({ ...newMember, phone_number: e.target.value })}
                    className="w-full bg-dark-800 border border-white/10 text-white font-bold rounded-2xl px-4 py-4 outline-none focus:border-brand-500 transition-colors shadow-inner"
                  />
                </div>

                {/* Category */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-4 bg-dark-900 lg:bg-dark-900/50 px-1.5 text-[10px] font-black text-brand-500 uppercase tracking-widest z-10">
                    Category
                  </label>
                  <select
                    value={newMember.category}
                    onChange={(e) => setNewMember({ ...newMember, category: e.target.value })}
                    className="w-full bg-dark-800 border border-brand-500/30 text-white font-bold rounded-2xl px-4 py-4 outline-none appearance-none cursor-pointer focus:border-brand-500 transition-colors"
                  >
                    <option>Weight Training</option>
                    <option>Cardio</option>
                    <option>Yoga</option>
                    <option>CrossFit</option>
                    <option>Boxing</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-500">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                {/* Fee and Paid */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3 bg-dark-900 lg:bg-dark-900/50 px-1 text-[10px] font-black text-neutral-400 uppercase tracking-widest z-10">
                      Total Fee
                    </label>
                    <input
                      type="number"
                      placeholder="₹"
                      value={newMember.monthly_fee}
                      onChange={(e) => setNewMember({ ...newMember, monthly_fee: e.target.value })}
                      className="w-full bg-dark-800 border border-white/10 text-white font-black text-xl rounded-2xl px-4 py-4 outline-none focus:border-brand-500 transition-colors shadow-inner"
                    />
                  </div>
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3 bg-dark-900 lg:bg-dark-900/50 px-1 text-[10px] font-black text-neutral-400 uppercase tracking-widest z-10">
                      Paid Today
                    </label>
                    <input
                      type="number"
                      placeholder="₹"
                      value={newMember.amount_paid}
                      onChange={(e) => setNewMember({ ...newMember, amount_paid: e.target.value })}
                      className="w-full bg-dark-800 border border-white/10 text-white font-black text-xl rounded-2xl px-4 py-4 outline-none focus:border-brand-500 transition-colors shadow-inner"
                    />
                  </div>
                </div>

                {/* Udhaar Warning */}
                {calculateUdhaar() > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex justify-between items-center transition-all">
                    <span className="text-orange-500 font-bold text-xs uppercase tracking-wider">Udhaar Generated</span>
                    <span className="text-orange-500 font-black text-lg tracking-tight">₹{calculateUdhaar().toLocaleString("en-IN")}</span>
                  </div>
                )}

                {/* Start Date */}
                <div className="pt-2">
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3 px-1">Subscription Starts On</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setStartDateMode("today");
                        setShowCustomDatePicker(false);
                      }}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-all ${
                        startDateMode === "today"
                          ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                          : "bg-dark-800 border border-white/5 text-neutral-400 hover:text-white hover:bg-dark-700"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        setStartDateMode("tomorrow");
                        setShowCustomDatePicker(false);
                      }}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-all ${
                        startDateMode === "tomorrow"
                          ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                          : "bg-dark-800 border border-white/5 text-neutral-400 hover:text-white hover:bg-dark-700"
                      }`}
                    >
                      Tomorrow
                    </button>
                    <button
                      onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-all ${
                        startDateMode === "custom"
                          ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                          : "bg-dark-800 border border-white/5 text-neutral-400 hover:text-white hover:bg-dark-700"
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {showCustomDatePicker && (
                    <div className="mt-3">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          setStartDateMode("custom");
                        }}
                        className="w-full bg-dark-800 border border-white/10 text-white font-bold rounded-2xl px-4 py-3 outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleAddMember}
                className="w-full bg-brand-500 hover:bg-brand-400 text-black font-black text-lg py-5 rounded-2xl mt-6 shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all flex justify-center items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Member
              </button>

              {statusMessage && (
                <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-3 text-center text-neutral-300 text-xs font-semibold">
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <div className="lg:hidden fixed bottom-6 left-0 right-0 z-30 px-5 max-w-md mx-auto pointer-events-none flex justify-center">
        <button
          onClick={() => setShowMobileSheet(true)}
          className="pointer-events-auto bg-brand-500 text-black w-16 h-16 rounded-[20px] shadow-[0_10px_30px_rgba(16,185,129,0.4)] flex justify-center items-center active:scale-90 transition-transform"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
