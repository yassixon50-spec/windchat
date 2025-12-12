import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactsService, Contact } from '../services/contacts';
import { chatService, ChatUser } from '../services/chat';

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [nickname, setNickname] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await contactsService.getContacts();
      setContacts(data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await chatService.searchUsers(searchQuery);
      // Filter out users already in contacts
      const contactIds = contacts.map((c) => c.contactId);
      setSearchResults(results.filter((u) => !contactIds.includes(u.id)));
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleAddContact = async () => {
    if (!selectedUser) return;
    try {
      const contact = await contactsService.addContact(selectedUser.id, nickname || undefined);
      setContacts((prev) => [contact, ...prev]);
      setShowAddModal(false);
      setSelectedUser(null);
      setNickname('');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const handleUpdateNickname = async () => {
    if (!editingContact) return;
    try {
      const updated = await contactsService.updateContact(editingContact.id, nickname);
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingContact(null);
      setNickname('');
    } catch (error) {
      console.error('Failed to update contact:', error);
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (!confirm('Remove this contact?')) return;
    try {
      await contactsService.deleteContact(contact.id);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const startChat = async (contactId: string) => {
    try {
      await chatService.createChat(contactId);
      navigate('/');
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const formatLastSeen = (lastSeen: string): string => {
    const now = new Date();
    const seen = new Date(lastSeen);
    const diffMs = now.getTime() - seen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return seen.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0e1621] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1621]">
      {/* Header */}
      <div className="h-[56px] px-4 flex items-center gap-3 bg-[#17212b]">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center text-[#aaaaaa] hover:bg-[#232e3c] rounded-full"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-medium flex-1">Contacts</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-10 h-10 flex items-center justify-center text-[#3390ec] hover:bg-[#232e3c] rounded-full"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Contacts List */}
      <div className="max-w-2xl mx-auto">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-[100px] h-[100px] rounded-full bg-[#232e3c] flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-1">No contacts yet</h3>
            <p className="text-[#6c7883] text-sm mb-4">Add contacts to start chatting</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-[#3390ec] text-white rounded-lg hover:bg-[#2b7fd4]"
            >
              Add Contact
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#0e1621]">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-[#17212b] transition-colors group"
              >
                <div className="relative">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#7b68ee] to-[#9370db] flex items-center justify-center text-white text-lg font-medium">
                    {contact.contact.firstName.charAt(0)}
                  </div>
                  {contact.contact.isOnline && (
                    <div className="absolute bottom-0 right-0 w-[14px] h-[14px] rounded-full border-2 border-[#0e1621] bg-[#4dcd5e]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {contact.nickname || `${contact.contact.firstName} ${contact.contact.lastName || ''}`}
                    </span>
                    {contact.nickname && (
                      <span className="text-[#6c7883] text-sm">
                        ({contact.contact.firstName})
                      </span>
                    )}
                  </div>
                  <p className="text-[#6c7883] text-sm">
                    {contact.contact.isOnline ? 'online' : `last seen ${formatLastSeen(contact.contact.lastSeen)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startChat(contact.contactId)}
                    className="p-2 text-[#3390ec] hover:bg-[#232e3c] rounded-full"
                    title="Start chat"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { setEditingContact(contact); setNickname(contact.nickname || ''); }}
                    className="p-2 text-[#6c7883] hover:bg-[#232e3c] rounded-full"
                    title="Edit nickname"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact)}
                    className="p-2 text-red-400 hover:bg-[#232e3c] rounded-full"
                    title="Remove contact"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#17212b] rounded-lg w-[400px] max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-[#0e1621] flex items-center justify-between">
              <h2 className="text-white text-lg font-medium">Add Contact</h2>
              <button
                onClick={() => { setShowAddModal(false); setSelectedUser(null); setSearchQuery(''); setSearchResults([]); }}
                className="text-[#6c7883] hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {!selectedUser ? (
              <>
                <div className="p-4">
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec]"
                  />
                </div>
                <div className="flex-1 overflow-y-auto max-h-[300px]">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#232e3c]"
                    >
                      <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#7b68ee] to-[#9370db] flex items-center justify-center text-white font-medium">
                        {user.firstName.charAt(0)}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-[#6c7883] text-sm">{user.phone}</div>
                      </div>
                    </button>
                  ))}
                  {searchResults.length === 0 && searchQuery && (
                    <p className="text-center text-[#6c7883] py-8">No users found</p>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4 p-3 bg-[#232e3c] rounded-lg">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#7b68ee] to-[#9370db] flex items-center justify-center text-white text-lg font-medium">
                    {selectedUser.firstName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-medium">{selectedUser.firstName} {selectedUser.lastName}</div>
                    <div className="text-[#6c7883] text-sm">{selectedUser.phone}</div>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Nickname (optional)"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec] mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 py-3 bg-[#242f3d] text-white rounded-lg hover:bg-[#2d3a4d]"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleAddContact}
                    className="flex-1 py-3 bg-[#3390ec] text-white rounded-lg hover:bg-[#2b7fd4]"
                  >
                    Add Contact
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Nickname Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#17212b] rounded-lg w-[350px] p-4">
            <h2 className="text-white text-lg font-medium mb-4">Edit Nickname</h2>
            <input
              type="text"
              placeholder="Nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec] mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setEditingContact(null); setNickname(''); }}
                className="flex-1 py-3 bg-[#242f3d] text-white rounded-lg hover:bg-[#2d3a4d]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateNickname}
                className="flex-1 py-3 bg-[#3390ec] text-white rounded-lg hover:bg-[#2b7fd4]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
