"use client";

import { useState, useEffect } from "react";
import { X, Send, Users } from "lucide-react";

interface Friend {
  id: string;
  name: string;
  username?: string;
  profileImageUrl?: string;
}

interface Group {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
}

interface InviteFriendsModalProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteFriendsModal({
  eventId,
  eventTitle,
  isOpen,
  onClose,
}: InviteFriendsModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFriendsAndGroups();
      // Reset state when opening
      setSelectedFriends([]);
      setSelectedGroup(null);
      setMessage("");
      setSuccess(false);
    }
  }, [isOpen]);

  const fetchFriendsAndGroups = async () => {
    setLoading(true);
    try {
      const [friendsRes, groupsRes] = await Promise.all([
        fetch("/api/friends"),
        fetch("/api/groups"),
      ]);
      const friendsData = await friendsRes.json();
      const groupsData = await groupsRes.json();

      setFriends(friendsData.friends || []);
      setGroups(groupsData.groups || []);
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (selectedFriends.length === 0 && !selectedGroup) return;

    setSending(true);
    try {
      const res = await fetch("/api/calendar/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          inviteeIds: selectedFriends,
          groupId: selectedGroup,
          message: message || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch {
      /* silently handled */
    } finally {
      setSending(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Invite to Event</h2>
            <p className="text-sm text-gray-500 truncate">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Invitations Sent!</h3>
            <p className="text-gray-600">
              Your friends will be notified about this event.
            </p>
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {/* Select Friends */}
                  {friends.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Friends
                      </label>
                      <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg">
                        {friends.map((friend) => (
                          <label
                            key={friend.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFriends.includes(friend.id)}
                              onChange={() => toggleFriend(friend.id)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                              {friend.profileImageUrl ? (
                                <img
                                  src={friend.profileImageUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-medium">
                                  {friend.name?.charAt(0) || "?"}
                                </div>
                              )}
                            </div>
                            <span className="text-sm">{friend.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Or Select Group */}
                  {groups.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Or invite a group
                      </label>
                      <select
                        value={selectedGroup || ""}
                        onChange={(e) =>
                          setSelectedGroup(e.target.value || null)
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Select a group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.emoji} {group.name} ({group.memberCount}{" "}
                            members)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {friends.length === 0 && groups.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">
                        No friends or groups to invite yet.
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Add friends to start inviting them to events!
                      </p>
                    </div>
                  )}

                  {/* Message */}
                  {(friends.length > 0 || groups.length > 0) && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Add a message (optional)
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Want to check this out together?"
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm h-20 resize-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {(friends.length > 0 || groups.length > 0) && (
              <div className="p-4 border-t flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={
                    sending ||
                    (selectedFriends.length === 0 && !selectedGroup)
                  }
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Invitations
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
