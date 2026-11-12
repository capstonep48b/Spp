const AdminPengumumanView = React.memo(function AdminPengumumanView({
  announcements,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [formErrors, setFormErrors] = useState({
    title: '',
    content: ''
  });
  const titleInputRef = React.useRef(null);
  const contentInputRef = React.useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    date: formatDateIndo(new Date())
  });
  const openModal = (ann = null) => {
    setFormErrors({
      title: '',
      content: ''
    });
    if (ann) {
      setEditingAnn(ann);
      setFormData({
        ...ann,
        date: formatDateIndo(ann.date)
      });
    } else {
      setEditingAnn(null);
      setFormData({
        title: '',
        content: '',
        imageUrl: '',
        date: formatDateIndo(new Date())
      });
    }
    setShowModal(true);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    const cleanTitle = String(formData.title || '').trim();
    const cleanContent = String(formData.content || '').trim();
    const nextErrors = {
      title: cleanTitle ? '' : 'Judul pengumuman tidak boleh kosong.',
      content: cleanContent ? '' : 'Isi berita / pengumuman tidak boleh kosong.'
    };
    if (nextErrors.title || nextErrors.content) {
      setFormErrors(nextErrors);
      if (nextErrors.title && titleInputRef.current) {
        titleInputRef.current.focus();
      } else if (nextErrors.content && contentInputRef.current) {
        contentInputRef.current.focus();
      }
      return;
    }
    const payload = {
      ...formData,
      title: cleanTitle,
      content: cleanContent,
      date: formatDateIndo(formData.date) || formatDateIndo(new Date())
    };
    let saveResult = true;
    if (editingAnn) {
      saveResult = await onUpdateAnnouncement(editingAnn.id, payload);
    } else {
      saveResult = await onAddAnnouncement(payload);
    }
    if (saveResult !== false) {
      setFormErrors({
        title: '',
        content: ''
      });
      setShowModal(false);
    }
  };
  const handleImageFileChange = async e => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImageFileToDataUrl(file, 960, 0.8);
      if (compressed) {
        setFormData(prev => ({
          ...prev,
          imageUrl: compressed
        }));
      }
    }
  };
  return <div className="space-y-6">
          {previewImage && <ImagePreviewModal imageUrl={previewImage.url} title={previewImage.title} onClose={() => setPreviewImage(null)} />}

          <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Pengumuman & Berita Sekolah</h2>
              <p className="text-xs text-slate-500 mt-1">Kelola berita resmi dan pengumuman kegiatan sekolah yang tampil di portal wali murid.</p>
            </div>
            <button onClick={() => openModal()} className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 transition-all flex items-center gap-2">
              <Icon name="plus-circle" size={16} />
              <span>Tambah Berita / Pengumuman</span>
            </button>
          </div>

          {!announcements || announcements.length === 0 ? <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 font-medium">
              Belum ada berita pengumuman yang dibuat. Klik tombol di atas untuk membuat berita baru.
            </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map(ann => <div key={ann.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden h-full">
                  {ann.imageUrl ? <div onClick={() => setPreviewImage({
          url: ann.imageUrl,
          title: ann.title
        })} className="relative group cursor-pointer overflow-hidden h-44 w-full bg-slate-100 shrink-0">
                      <img src={ann.imageUrl} alt={ann.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-black text-xs">
                        <Icon name="maximize-2" size={16} />
                        <span>Preview Foto</span>
                      </div>
                    </div> : <div className="h-44 w-full bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-5 flex flex-col justify-between text-white shrink-0 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-white/25 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          Pengumuman Resmi
                        </span>
                        <Icon name="megaphone" size={20} className="text-blue-100" />
                      </div>
                      <h4 className="font-black text-sm text-white line-clamp-2 leading-snug drop-shadow-sm">
                        {ann.title}
                      </h4>
                    </div>}

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-lg text-[11px] border border-blue-100">
                          <Icon name="calendar" size={12} />
                          {formatDateIndo(ann.date)}
                        </span>
                      </div>

                      <h3 className="font-black text-slate-800 text-base mb-2 line-clamp-2 leading-tight">
                        {ann.title}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3 whitespace-pre-line">
                        {ann.content}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                      {ann.imageUrl && <button type="button" onClick={() => setPreviewImage({
              url: ann.imageUrl,
              title: ann.title
            })} className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors" title="Preview foto">
                          <Icon name="image" size={14} />
                          <span>Foto</span>
                        </button>}
                      <button type="button" onClick={() => openModal(ann)} className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-blue-200" title="Edit pengumuman">
                        <Icon name="edit" size={14} />
                        <span>Edit</span>
                      </button>
                      <button type="button" onClick={() => onDeleteAnnouncement(ann.id)} className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-rose-200" title="Hapus pengumuman">
                        <Icon name="trash-2" size={14} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>)}
            </div>}

          {showModal && <ModalPortal><div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in" onClick={e => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}>
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col my-auto relative border border-slate-200 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                  <h3 className="font-extrabold text-slate-800 text-base">{editingAnn ? 'Edit Berita Pengumuman' : 'Tambah Berita / Pengumuman Baru'}</h3>
                  <button type="button" onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors" title="Tutup">
                    <Icon name="x" size={18} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} noValidate className="space-y-3 text-xs overflow-y-auto flex-1 pr-0.5">
                  {(formErrors.title || formErrors.content) && <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold flex items-start gap-2">
                      <Icon name="alert-circle" size={16} className="shrink-0 mt-0.5 text-rose-600" />
                      <span>Judul pengumuman dan isi berita wajib diisi (tidak boleh kosong).</span>
                    </div>}

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Judul Pengumuman <span className="text-rose-500">*</span>
                    </label>
                    <input ref={titleInputRef} type="text" required placeholder="Contoh: Jadwal Libur & Kegiatan Pentas Seni" value={formData.title} aria-invalid={Boolean(formErrors.title)} onChange={e => {
              const val = e.target.value;
              setFormData({
                ...formData,
                title: val
              });
              if (formErrors.title && val.trim()) {
                setFormErrors(prev => ({
                  ...prev,
                  title: ''
                }));
              }
            }} className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-slate-900 border focus:outline-none focus:ring-2 ${formErrors.title ? 'bg-rose-50/50 border-rose-500 focus:ring-rose-500/30' : 'bg-slate-50 border-slate-300 focus:bg-white focus:ring-blue-500/30'}`} />
                    {formErrors.title && <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <Icon name="alert-triangle" size={12} className="shrink-0" />
                        <span>{formErrors.title}</span>
                      </p>}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Isi Berita / Pengumuman <span className="text-rose-500">*</span>
                    </label>
                    <textarea ref={contentInputRef} required rows="5" placeholder="Tuliskan isi detail pengumuman..." value={formData.content} aria-invalid={Boolean(formErrors.content)} onChange={e => {
              const val = e.target.value;
              setFormData({
                ...formData,
                content: val
              });
              if (formErrors.content && val.trim()) {
                setFormErrors(prev => ({
                  ...prev,
                  content: ''
                }));
              }
            }} className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-slate-900 border focus:outline-none focus:ring-2 ${formErrors.content ? 'bg-rose-50/50 border-rose-500 focus:ring-rose-500/30' : 'bg-slate-50 border-slate-300 focus:bg-white focus:ring-blue-500/30'}`}></textarea>
                    {formErrors.content && <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <Icon name="alert-triangle" size={12} className="shrink-0" />
                        <span>{formErrors.content}</span>
                      </p>}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Upload / Link Foto Gambar Berita</label>
                    <div className="space-y-2">
                      <input type="file" accept="image/*" onChange={handleImageFileChange} className="w-full text-xs text-slate-500 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-bold hover:file:bg-emerald-100" />
                      <input type="text" placeholder="Atau tempelkan URL Gambar Foto Pengumuman" value={formData.imageUrl} onChange={e => setFormData({
                ...formData,
                imageUrl: e.target.value
              })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Tanggal Terbit (Pilih Kalender)</label>
                    <div className="flex items-center gap-2">
                      <input type="date" value={dateToYyyyMmDd(formData.date)} onChange={e => {
                if (e.target.value) {
                  setFormData({
                    ...formData,
                    date: formatDateIndo(e.target.value)
                  });
                }
              }} className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 cursor-pointer shadow-2xs" />
                      <div className="flex-1 px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-xl font-black text-blue-900 text-xs flex items-center gap-2 shadow-2xs">
                        <Icon name="calendar" size={15} className="text-blue-600 shrink-0" />
                        <span className="truncate">{formData.date || formatDateIndo(new Date())}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-600">Batal</button>
                    <button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl">Simpan Berita</button>
                  </div>
                </form>
              </div>
            </div></ModalPortal>}
        </div>;
});

const AdminPengaduanView = React.memo(function AdminPengaduanView({
  complaints,
  onReplyComplaint,
  onToggleComplaintStatus,
  onMarkAsRead
}) {
  const [activeChatId, setActiveChatId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());
  const [expandedStudents, setExpandedStudents] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const chatEndRef = React.useRef(null);
  const nextExpiryMs = useMemo(() => {
    const cur = Date.now();
    let minExp = Infinity;
    (complaints || []).forEach(c => {
      const exp = c.expiresAtMs || (c.createdAtMs || 0) + 3600000;
      if (exp > cur && exp < minExp) minExp = exp;
    });
    return minExp;
  }, [complaints, nowMs]);
  useEffect(() => {
    if (!Number.isFinite(nextExpiryMs)) return undefined;
    const cur = Date.now();
    const delayUntilExp = Math.max(50, nextExpiryMs - cur + 50);
    const timeoutId = setTimeout(() => setNowMs(Date.now()), delayUntilExp);
    const intervalId = setInterval(() => setNowMs(Date.now()), 60000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [nextExpiryMs]);
  const activeChat = useMemo(() => complaints.find(c => c.id === activeChatId), [complaints, activeChatId]);
  const activeChatMsgCount = activeChat?.messages?.length || 0;
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({
        behavior: "smooth"
      });
    }
  }, [activeChatId, activeChatMsgCount]);
  const activeComplaints = useMemo(() => complaints.filter(c => nowMs <= (c.expiresAtMs || c.createdAtMs + 3600000)).sort((a, b) => b.createdAtMs - a.createdAtMs), [complaints, nowMs]);
  const expiredComplaints = useMemo(() => complaints.filter(c => nowMs > (c.expiresAtMs || c.createdAtMs + 3600000)).sort((a, b) => b.createdAtMs - a.createdAtMs), [complaints, nowMs]);
  const groupedExpired = useMemo(() => {
    const map = {};
    expiredComplaints.forEach(c => {
      const rawName = (c.studentName || 'Wali Murid').trim();
      const key = rawName.toLowerCase();
      if (!map[key]) {
        map[key] = {
          key,
          studentName: rawName,
          waliName: c.waliName || 'Wali Murid',
          items: []
        };
      }
      map[key].items.push(c);
    });
    return Object.values(map);
  }, [expiredComplaints]);
  const toggleStudent = key => {
    setExpandedStudents(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const handleSelectChat = c => {
    if (!c) return;
    setActiveChatId(c.id);
    if (onMarkAsRead) {
      onMarkAsRead('complaint', c.id);
    }
  };
  useEffect(() => {
    if (!activeChatId && activeComplaints.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
      handleSelectChat(activeComplaints[0]);
    }
  }, [activeComplaints.length]);
  return <div className="h-[calc(100vh-6rem)] animate-in fade-in duration-300 flex flex-col md:flex-row gap-4">
          {previewImage && <ImagePreviewModal imageUrl={previewImage.url} title={previewImage.title} onClose={() => setPreviewImage(null)} />}
          
          
          <div className={`w-full md:w-80 lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-sm flex-col overflow-hidden shrink-0 ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
             <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
               <div>
                 <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                   <Icon name="message-square" size={20} className="text-emerald-600" /> Pesan Pengaduan
                 </h2>
                 <p className="text-[11px] text-slate-500 font-medium mt-0.5">Sesi live chat aktif selama 1 jam.</p>
               </div>
               <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                 {activeComplaints.length} Live
               </span>
             </div>
             
             <div className="flex-1 overflow-y-auto p-3 space-y-4">
                
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Live Chat Aktif ({activeComplaints.length})
                  </h3>
                  {activeComplaints.length === 0 && <div className="p-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-bold italic">Tidak ada chat aktif saat ini.</p>
                    </div>}
                  <div className="space-y-2">
                    {activeComplaints.map(c => {
              const isSelected = activeChatId === c.id;
              const remainingMinutes = Math.max(0, Math.floor((c.expiresAtMs - nowMs) / 60000));
              const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
              return <div key={c.id} onClick={() => handleSelectChat(c)} className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-emerald-50 border-emerald-300 shadow-sm ring-2 ring-emerald-400/20' : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                                {c.studentName ? c.studentName.charAt(0).toUpperCase() : 'W'}
                              </div>
                              <h4 className="font-black text-slate-800 text-sm truncate">{c.studentName}</h4>
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                          </div>
                          
                          <p className="text-xs font-black text-slate-700 truncate pl-10">{c.title}</p>
                          {lastMsg && <p className="text-xs text-slate-500 truncate pl-10 mt-0.5 font-medium">
                              <span className="font-bold text-slate-600">{lastMsg.sender === 'Admin TU' ? 'Anda: ' : ''}</span>
                              {lastMsg.text}
                            </p>}
                          
                          <div className="flex items-center justify-between mt-2 pl-10 text-[10px] text-slate-400 font-bold">
                            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full font-mono font-bold">
                              <Icon name="clock" size={10} /> Sisa {remainingMinutes} mnt
                            </span>
                            <span>{formatDateIndo(c.date)}</span>
                          </div>
                        </div>;
            })}
                  </div>
                </div>

                
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Riwayat Terkunci ({expiredComplaints.length})
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">
                      {groupedExpired.length} Wali Siswa
                    </span>
                  </div>

                  {groupedExpired.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-3">Belum ada riwayat pengaduan tersimpan.</p> : <div className="space-y-2">
                      {groupedExpired.map(group => {
              const isExpanded = expandedStudents[group.key] ?? false;
              const hasSelectedChild = group.items.some(i => i.id === activeChatId);
              return <div key={group.key} className={`rounded-2xl border transition-all overflow-hidden ${hasSelectedChild ? 'border-blue-300 bg-blue-50/30 shadow-xs' : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'}`}>
                            
                            <button type="button" onClick={() => toggleStudent(group.key)} className="w-full p-3 flex items-center justify-between text-left transition-colors">
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-xs shrink-0">
                                  {group.studentName ? group.studentName.charAt(0).toUpperCase() : 'W'}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-extrabold text-slate-800 text-xs truncate">
                                    {group.studentName}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-medium truncate">
                                    {group.waliName || 'Wali Murid'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 flex items-center gap-1">
                                  <Icon name="lock" size={10} />
                                  {group.items.length} Pesan
                                </span>
                                <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} className="text-slate-400" />
                              </div>
                            </button>

                            
                            {isExpanded && <div className="px-2 pb-2 space-y-1.5 border-t border-slate-200/60 pt-2 animate-in fade-in duration-150">
                                {group.items.map(c => {
                    const isSelected = activeChatId === c.id;
                    const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
                    return <div key={c.id} onClick={() => handleSelectChat(c)} className={`p-2.5 rounded-xl cursor-pointer transition-all border text-left ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'}`}>
                                      <div className="flex items-center justify-between mb-0.5">
                                        <p className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                          {c.title}
                                        </p>
                                        <span className={`text-[9px] font-bold shrink-0 ml-1.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                          {formatDateIndo(c.date)}
                                        </span>
                                      </div>

                                      {lastMsg && <p className={`text-[11px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                          {lastMsg.sender === 'Admin TU' ? 'Anda: ' : ''}{lastMsg.text}
                                        </p>}
                                    </div>;
                  })}
                              </div>}
                          </div>;
            })}
                    </div>}
                </div>
             </div>
          </div>

          
          <div className={`w-full flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex-col overflow-hidden ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
            {!activeChat ? <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 border border-emerald-100 shadow-inner">
                  <Icon name="message-circle" size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-800">Pilih Percakapan Chat</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium max-w-sm">Pilih pesan pengaduan di panel sebelah kiri untuk membalas obrolan wali murid secara real-time.</p>
              </div> : <>
                
                <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${nowMs <= activeChat.expiresAtMs ? 'bg-emerald-50/60 border-emerald-100' : 'bg-slate-100 border-slate-200'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setActiveChatId(null)} className="md:hidden p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl transition-colors shrink-0 border border-slate-200 flex items-center justify-center shadow-sm" title="Kembali ke Daftar Chat">
                      <Icon name="arrow-left" size={18} />
                    </button>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 text-base sm:text-lg truncate">{activeChat.title}</h3>
                      <p className="text-xs text-slate-600 font-bold truncate mt-0.5">Siswa: <span className="text-emerald-700">{activeChat.studentName}</span> • Wali: {activeChat.waliName || 'Wali Murid'}</p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {nowMs <= activeChat.expiresAtMs ? <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5">
                         <span className="w-2 h-2 rounded-full bg-white"></span>
                         LIVE CHAT
                       </div> : <div className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-black border border-slate-300 flex items-center gap-1.5">
                         <Icon name="lock" size={14} /> EXPIRED
                       </div>}
                  </div>
                </div>
                
                
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#f0f4f8] space-y-4">
                  <div className="text-center my-3">
                    <span className="bg-white text-slate-500 text-[10px] font-black uppercase px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
                      Sesi Obrolan Dibuka: {formatDateIndo(activeChat.date)}
                    </span>
                  </div>

                  {activeChat.messages && activeChat.messages.map((msg, i) => {
            const isAdmin = msg.sender === 'Admin TU';
            return <div key={i} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                         <div className={`max-w-[88%] sm:max-w-[75%] p-3.5 sm:p-4 rounded-2xl shadow-sm ${isAdmin ? 'bg-emerald-600 text-white rounded-tr-xs' : 'bg-white border border-slate-200/90 rounded-tl-xs text-slate-800'}`}>
                           <div className="flex items-center gap-1.5 mb-1 opacity-80">
                             <Icon name={isAdmin ? 'shield-check' : 'user'} size={12} />
                             <span className="text-[10px] font-black uppercase tracking-wider">{msg.sender}</span>
                           </div>
                           <p className="text-xs sm:text-sm font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                           {msg.imageUrl && <div className="mt-2.5">
                               <img src={msg.imageUrl} alt="Lampiran" loading="lazy" decoding="async" className="max-w-full max-h-64 object-cover rounded-xl shadow-md border border-slate-200 cursor-pointer hover:opacity-95 transition-opacity" onClick={() => setPreviewImage({
              url: msg.imageUrl,
              title: 'Lampiran Pengaduan - ' + (activeChat.studentName || 'Wali Murid')
            })} />
                             </div>}
                         </div>
                         <span className="text-[10px] text-slate-500 font-bold mt-1 px-1">{formatDateTimeIndo(msg.time, activeChat.date)}</span>
                      </div>;
          })}
                  <div ref={chatEndRef} />
                </div>
                
                
                <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 shrink-0">
                  {nowMs <= activeChat.expiresAtMs ? <div className="flex items-center gap-2">
                      <input type="file" id={`admin_file_${activeChat.id}`} className="hidden" accept="image/*" onChange={async e => {
              const file = e.target.files[0];
              if (file) {
                const compressed = await compressImageFileToDataUrl(file, 960, 0.8);
                if (compressed) {
                  onReplyComplaint(activeChat.id, replyText || '(Mengirim Lampiran)', 'Admin TU', compressed);
                  setReplyText('');
                }
              }
            }} />
                      <button type="button" onClick={() => document.getElementById(`admin_file_${activeChat.id}`).click()} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors flex items-center justify-center shrink-0" title="Kirim Lampiran Gambar">
                        <Icon name="paperclip" size={18} />
                      </button>
                      <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Ketik balasan Anda..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" onKeyDown={e => {
              if (e.key === 'Enter' && replyText.trim()) {
                onReplyComplaint(activeChat.id, replyText.trim(), 'Admin TU');
                setReplyText('');
              }
            }} />
                      <button type="button" onClick={() => {
              if (replyText.trim()) {
                onReplyComplaint(activeChat.id, replyText.trim(), 'Admin TU');
                setReplyText('');
              }
            }} className="px-4 sm:px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 font-black shrink-0 text-xs sm:text-sm">
                        <Icon name="send" size={18} /> <span className="hidden sm:inline">Kirim</span>
                      </button>
                    </div> : <div className="w-full py-3 bg-slate-100 border border-slate-200 rounded-xl text-center text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
                      <Icon name="lock" size={14} /> Sesi live chat 1 jam telah berakhir (Expired)
                    </div>}
                </div>
              </>}
          </div>
        </div>;
});

const AdminNoteCardItem = React.memo(function AdminNoteCardItem({
  n,
  onDeleteNote,
  onMarkNoteRead
}) {
  const hasReplies = Boolean(n.comments && n.comments.length > 0);
  const [isOpen, setIsOpen] = useState(!hasReplies);
  const getStoredReadCount = () => {
    try {
      const map = readJsonLsCached('spp_admin_read_note_replies', {}) || {};
      if (map[n.id] !== undefined) return map[n.id];
      return n.isRead ? n.comments ? n.comments.length : 0 : 0;
    } catch (e) {
      return 0;
    }
  };
  const [readCommentCount, setReadCommentCount] = useState(getStoredReadCount);
  useEffect(() => {
    const syncReadCount = () => setReadCommentCount(getStoredReadCount());
    syncReadCount();
    window.addEventListener('spp_note_read_updated', syncReadCount);
    return () => window.removeEventListener('spp_note_read_updated', syncReadCount);
  }, [n.id, n.comments?.length, n.isRead]);
  const unreadCount = Math.max(0, (n.comments?.length || 0) - readCommentCount);
  const markAsRead = () => {
    try {
      const stored = readJsonLsCached('spp_admin_read_note_replies', {});
      const map = {
        ...(stored && typeof stored === 'object' ? stored : {})
      };
      map[n.id] = n.comments ? n.comments.length : 0;
      writeJsonLsCached('spp_admin_read_note_replies', map);
      setReadCommentCount(map[n.id]);
      window.dispatchEvent(new Event('spp_note_read_updated'));
      if (onMarkNoteRead) onMarkNoteRead(n);
    } catch (e) {}
  };
  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && unreadCount > 0) {
      markAsRead();
    }
  };
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAsRead();
    }
  }, [isOpen, n.comments]);
  return <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all">
          <button type="button" onClick={handleToggle} className="w-full p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center text-left hover:bg-slate-100/70 transition-colors cursor-pointer">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-lg text-[10px] font-black uppercase">
                  <Icon name="tag" size={11} /> {n.category || 'Catatan TU'}
                </span>
                {unreadCount > 0 ? <span className="px-2.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center gap-1">
                    <Icon name="message-circle" size={11} /> {unreadCount} Balasan Baru
                  </span> : hasReplies ? <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black flex items-center gap-1">
                    <Icon name="message-circle" size={11} /> {n.comments.length} Balasan Masuk
                  </span> : <span className="px-2 py-0.5 bg-slate-200/70 text-slate-600 rounded-full text-[10px] font-bold">
                    Menunggu Tanggapan
                  </span>}
              </div>
              <h4 className="font-black text-slate-800 text-sm sm:text-base truncate">Siswa: {n.studentName}</h4>
              <p className="text-xs text-slate-500 font-bold mt-0.5 flex items-center gap-1">
                <Icon name="calendar" size={12} className="text-teal-600" /> {formatDateTimeIndo(n.date)}
                {hasReplies && <span className="text-blue-600 font-bold ml-2 text-[11px]">
                    • {isOpen ? 'Tutup percakapan' : 'Klik untuk buka riwayat percakapan'}
                  </span>}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-600 transition-transform">
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} />
              </div>
              <button type="button" onClick={e => {
          e.stopPropagation();
          onDeleteNote && onDeleteNote(n.id);
        }} className="w-8 h-8 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-colors flex items-center justify-center shadow-xs" title="Hapus Catatan">
                <Icon name="trash-2" size={14} />
              </button>
            </div>
          </button>

          {isOpen && <div className="animate-in fade-in duration-200">
              <div className="p-5 text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed bg-white">
                {n.content}
              </div>
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100">
                <p className="text-xs font-black text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                  <Icon name="message-circle" size={13} className="text-blue-600" /> Balasan Wali Murid ({n.comments ? n.comments.length : 0})
                </p>
                {n.comments && n.comments.length > 0 ? <div className="space-y-2 mt-2">
                    {n.comments.map((cm, i) => <div key={i} className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            {cm.sender}
                          </p>
                          <span className="text-[10px] text-slate-500 font-bold">{formatDateTimeIndo(cm.time, n.date)}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{cm.text}</p>
                      </div>)}
                  </div> : <p className="text-xs text-slate-400 italic">Belum ada tanggapan dari wali murid.</p>}
              </div>
            </div>}
        </div>;
});

const AdminCatatanView = React.memo(function AdminCatatanView({
  students,
  notes,
  onAddNote,
  onDeleteNote,
  onMarkNoteRead
}) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [content, setContent] = useState('');
  const handleSubmit = e => {
    e.preventDefault();
    if (!selectedStudent || !content.trim()) return;
    const student = students.find(s => s.id === selectedStudent);
    if (!student) return;
    const now = new Date();
    const clockStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\./g, ':');
    onAddNote({
      studentId: student.id,
      studentName: student.name,
      category: 'Catatan TU',
      title: `Catatan Tata Usaha (TU)`,
      content: content.trim(),
      date: `${formatDateIndo(now)} • ${clockStr} WIB`,
      comments: []
    });
    setContent('');
    setSelectedStudent('');
  };
  return <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Icon name="edit-3" size={28} className="text-teal-600" /> Catatan Siswa (Tata Usaha)</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Pilih nama siswa dan langsung ketik pesan atau catatan TU yang akan masuk ke portal wali murid.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 sticky top-24">
                <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Icon name="send" size={18} className="text-teal-600" />
                  Kirim Catatan Siswa
                </h3>
                
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 uppercase">Pilih Siswa</label>
                  <SearchableStudentSelect required students={students} value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} placeholder="-- Cari & Pilih Siswa --" theme="teal" />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 uppercase">Isi Pesan / Catatan TU</label>
                  <textarea required value={content} onChange={e => setContent(e.target.value)} rows="6" placeholder="Tuliskan catatan atau pesan TU langsung untuk siswa ini..." className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"></textarea>
                </div>

                <button type="submit" className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                  <Icon name="send" size={18} /> Kirim Pesan ke Siswa
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
               {notes.length === 0 ? <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                   <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3"><Icon name="inbox" size={32} /></div>
                   <p className="text-slate-500 font-bold">Belum ada catatan siswa yang dikirimkan.</p>
                 </div> : [...notes].sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now())).map(n => <AdminNoteCardItem key={n.id} n={n} onDeleteNote={onDeleteNote} onMarkNoteRead={onMarkNoteRead} />)}
            </div>
          </div>
        </div>;
});

const AdminPengaturanView = React.memo(function AdminPengaturanView({
  settings,
  onSaveSettings
}) {
  const [formData, setFormData] = useState({
    ...settings
  });
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassTarif, setNewClassTarif] = useState('');
  const isDirtyRef = useRef(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetStartMonth, setNewPresetStartMonth] = useState('Juli');
  const [newPresetStartYear, setNewPresetStartYear] = useState(2026);
  const [newPresetEndMonth, setNewPresetEndMonth] = useState('Juni');
  const [newPresetEndYear, setNewPresetEndYear] = useState(2027);
  const [newPresetSemester, setNewPresetSemester] = useState('Semua');
  useEffect(() => {
    if (!isDirtyRef.current) {
      setFormData({
        ...settings
      });
      setNewAdminPassword('');
    }
  }, [settings]);
  const updateFormState = patch => {
    isDirtyRef.current = true;
    setFormData(prev => {
      const next = {
        ...prev,
        ...patch
      };
      const semTag = next.semester && next.semester !== 'Semua' ? ` (${next.semester})` : '';
      const autoName = `Periode ${next.startMonth || 'Juli'} ${next.startYear || 2025} - ${next.endMonth || 'Juni'} ${next.endYear || 2026}${semTag}`;
      return {
        ...next,
        activePeriodName: autoName
      };
    });
  };
  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    isDirtyRef.current = false;
    const updatedClasses = [...(formData.customClasses || []), {
      name: newClassName.trim(),
      tarif: Number(newClassTarif) || 0
    }];
    const updated = {
      ...formData,
      customClasses: updatedClasses
    };
    setFormData(updated);
    onSaveSettings(updated);
    setNewClassName('');
    setNewClassTarif('');
  };
  const handleDeleteClass = idx => {
    isDirtyRef.current = false;
    const updatedClasses = (formData.customClasses || []).filter((_, i) => i !== idx);
    const updated = {
      ...formData,
      customClasses: updatedClasses
    };
    setFormData(updated);
    onSaveSettings(updated);
  };
  const handleUpdateClass = (idx, field, value) => {
    isDirtyRef.current = true;
    const updatedClasses = [...(formData.customClasses || [])];
    updatedClasses[idx] = {
      ...updatedClasses[idx],
      [field]: field === 'tarif' ? Number(value) || 0 : value
    };
    const updated = {
      ...formData,
      customClasses: updatedClasses
    };
    setFormData(updated);
  };
  const handleAddPresetManual = () => {
    isDirtyRef.current = false;
    const sM = newPresetStartMonth || 'Juli';
    const sY = Number(newPresetStartYear) || 2026;
    const eM = newPresetEndMonth || 'Juni';
    const eY = Number(newPresetEndYear) || 2027;
    const sem = newPresetSemester || 'Semua';
    const semTag = sem && sem !== 'Semua' ? ` (${sem})` : '';
    const name = newPresetName.trim() || `Periode ${sM} ${sY} - ${eM} ${eY}${semTag}`;
    const newPeriod = {
      id: Date.now().toString(),
      name: name,
      startMonth: sM,
      startYear: sY,
      endMonth: eM,
      endYear: eY,
      semester: sem,
      isActive: false
    };
    const existingPeriods = formData.academicPeriods || [];
    const updatedPeriods = [...existingPeriods, newPeriod];
    const updatedFormData = {
      ...formData,
      academicPeriods: updatedPeriods
    };
    setFormData(updatedFormData);
    onSaveSettings(updatedFormData);
    setNewPresetName('');
  };
  const handleUpdatePresetField = (idx, field, value) => {
    isDirtyRef.current = true;
    const updatedPeriods = [...(formData.academicPeriods || [])];
    const val = field === 'startYear' || field === 'endYear' ? Number(value) || 0 : value;
    updatedPeriods[idx] = {
      ...updatedPeriods[idx],
      [field]: val
    };
    let updatedFormData = {
      ...formData,
      academicPeriods: updatedPeriods
    };
    if (updatedPeriods[idx].isActive) {
      const semTag = updatedPeriods[idx].semester && updatedPeriods[idx].semester !== 'Semua' ? ` (${updatedPeriods[idx].semester})` : '';
      const autoName = updatedPeriods[idx].name || `Periode ${updatedPeriods[idx].startMonth} ${updatedPeriods[idx].startYear} - ${updatedPeriods[idx].endMonth} ${updatedPeriods[idx].endYear}${semTag}`;
      updatedFormData = {
        ...updatedFormData,
        activePeriodName: autoName,
        startMonth: updatedPeriods[idx].startMonth,
        startYear: updatedPeriods[idx].startYear,
        endMonth: updatedPeriods[idx].endMonth,
        endYear: updatedPeriods[idx].endYear,
        semester: updatedPeriods[idx].semester
      };
    }
    setFormData(updatedFormData);
  };
  const handleSaveCurrentAsPreset = () => {
    isDirtyRef.current = false;
    const sM = formData.startMonth || 'Juli';
    const sY = parseInt(formData.startYear) || 2025;
    const eM = formData.endMonth || 'Juni';
    const eY = parseInt(formData.endYear) || sY + 1;
    const sem = formData.semester || 'Semua';
    const semTag = sem && sem !== 'Semua' ? ` (${sem})` : '';
    const newName = `Periode ${sM} ${sY} - ${eM} ${eY}${semTag}`;
    const newPeriod = {
      id: Date.now().toString(),
      name: newName,
      startMonth: sM,
      startYear: sY,
      endMonth: eM,
      endYear: eY,
      semester: sem,
      isActive: true
    };
    const existingPeriods = formData.academicPeriods && formData.academicPeriods.length > 0 ? formData.academicPeriods : [];
    const filtered = existingPeriods.filter(p => !(p.startMonth === sM && String(p.startYear) === String(sY) && p.endMonth === eM && String(p.endYear) === String(eY) && (p.semester || 'Semua') === sem));
    const updatedPeriods = [newPeriod, ...filtered.map(p => ({
      ...p,
      isActive: false
    }))];
    const updatedFormData = {
      ...formData,
      activePeriodName: newName,
      startMonth: sM,
      startYear: sY,
      endMonth: eM,
      endYear: eY,
      semester: sem,
      academicYear: `${sY}/${eY}`,
      academicPeriods: updatedPeriods
    };
    setFormData(updatedFormData);
    onSaveSettings(updatedFormData);
    alert(`Rentang "${newName}" berhasil disimpan dan langsung diterapkan sebagai periode aktif!`);
  };
  const handleApplyPreset = p => {
    isDirtyRef.current = false;
    const sY = parseInt(p.startYear) || 2025;
    const eY = parseInt(p.endYear) || sY + 1;
    const updatedPeriods = (formData.academicPeriods || []).map(item => ({
      ...item,
      isActive: item.id === p.id || item.startMonth === p.startMonth && String(item.startYear) === String(p.startYear) && (item.semester || 'Semua') === (p.semester || 'Semua')
    }));
    const updatedFormData = {
      ...formData,
      activePeriodName: p.name,
      startMonth: p.startMonth,
      startYear: sY,
      endMonth: p.endMonth,
      endYear: eY,
      semester: p.semester || 'Semua',
      academicYear: p.name.replace(/[^0-9/]/g, '') || `${sY}/${eY}`,
      academicPeriods: updatedPeriods
    };
    setFormData(updatedFormData);
    onSaveSettings(updatedFormData);
    alert(`Periode aktif berhasil diubah dan diterapkan ke: ${p.name}`);
  };
  const handleDeletePreset = (idx, pName) => {
    if (!confirm(`Hapus preset "${pName}"?`)) return;
    isDirtyRef.current = false;
    const updatedPeriods = (formData.academicPeriods || []).filter((_, i) => i !== idx);
    const updatedFormData = {
      ...formData,
      academicPeriods: updatedPeriods
    };
    setFormData(updatedFormData);
    onSaveSettings(updatedFormData);
  };
  const handleSubmit = e => {
    e.preventDefault();
    isDirtyRef.current = false;
    const semTag = formData.semester && formData.semester !== 'Semua' ? ` (${formData.semester})` : '';
    const autoName = `Periode ${formData.startMonth || 'Juli'} ${formData.startYear || 2025} - ${formData.endMonth || 'Juni'} ${formData.endYear || 2026}${semTag}`;
    const payload = {
      ...formData,
      activePeriodName: autoName
    };
    if (newAdminPassword && newAdminPassword.trim().length > 0) {
      payload.adminPassword = newAdminPassword.trim();
    }
    onSaveSettings(payload);
    setNewAdminPassword('');
  };
  return <div className="bg-white p-4 sm:p-7 md:p-9 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <Icon name="sliders" size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Pengaturan Aplikasi & Periode SPP</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Konfigurasi identitas sekolah, periode aktif ajaran, kredensial login admin, gateway pembayaran, serta rombel kelompok kelas.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl sm:rounded-3xl border border-slate-200/90 space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-inner">
                    <Icon name="school" size={17} />
                  </span>
                  <span>Identitas Sekolah & Akun Admin TU</span>
                </h3>
                <span className="text-[11px] font-extrabold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                  Konfigurasi Utama
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="building" size={13} className="text-blue-600" />
                    <span>Nama Lembaga / Sekolah</span>
                  </label>
                  <input type="text" required value={formData.schoolName || ''} onChange={e => {
              isDirtyRef.current = true;
              setFormData({
                ...formData,
                schoolName: e.target.value
              });
            }} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs" placeholder="Contoh: PAUD SETIA BHAKTI" />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="calendar" size={13} className="text-blue-600" />
                    <span>Tahun Ajaran Default</span>
                  </label>
                  <input type="text" required value={formData.academicYear || ''} onChange={e => {
              isDirtyRef.current = true;
              setFormData({
                ...formData,
                academicYear: e.target.value
              });
            }} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs" placeholder="Contoh: 2025/2026" />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="map-pin" size={13} className="text-blue-600" />
                    <span>Alamat Lengkap Sekolah</span>
                  </label>
                  <input type="text" value={formData.address || ''} onChange={e => {
              isDirtyRef.current = true;
              setFormData({
                ...formData,
                address: e.target.value
              });
            }} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs" placeholder="Alamat sekolah..." />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="phone" size={13} className="text-emerald-600" />
                    <span>No. Kontak Resmi TU / WhatsApp</span>
                  </label>
                  <input type="text" value={formData.phone || ''} onChange={e => {
              isDirtyRef.current = true;
              setFormData({
                ...formData,
                phone: e.target.value
              });
            }} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs" placeholder="08123456789" />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="user-check" size={13} className="text-indigo-600" />
                    <span>Nama Admin / Kasir TU</span>
                  </label>
                  <input type="text" value={formData.adminName || ''} onChange={e => {
              isDirtyRef.current = true;
              setFormData({
                ...formData,
                adminName: e.target.value
              });
            }} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs" placeholder="Nama Admin TU" />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="user" size={13} className="text-indigo-600" />
                    <span>Username Login Admin</span>
                  </label>
                  <input type="text" value={formData.adminUsername || ''} onChange={e => {
              isDirtyRef.current = true;
              setFormData({
                ...formData,
                adminUsername: e.target.value
              });
            }} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs" placeholder="Username login" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      <Icon name="lock" size={13} className="text-amber-600" />
                      <span>Ganti Password Admin <span className="normal-case text-slate-400 font-normal">(Opsional)</span></span>
                    </label>
                  </div>
                  <input type="password" placeholder="Kosongkan jika tidak mau mengubah password" value={newAdminPassword} onChange={e => {
              isDirtyRef.current = true;
              setNewAdminPassword(e.target.value);
            }} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs" />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="clock" size={13} className="text-purple-600" />
                    <span>Tanggal Jatuh Tempo SPP (Tiap Bulan)</span>
                  </label>
                  <input type="number" min="1" max="31" value={formData.dueDateDay || 10} onChange={e => {
              isDirtyRef.current = true;
              setFormData({
                ...formData,
                dueDateDay: parseInt(e.target.value) || 10
              });
            }} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs" />
                </div>
              </div>
            </div>

            
            <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-100/80 pb-3">
                <h3 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                  <Icon name="calendar" size={18} className="text-emerald-700" />
                  Pengaturan Periode Pembayaran SPP (Rentang Bulan & Tahun)
                </h3>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Icon name="check-circle" size={12} /> Periode Aktif Berjalan
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>Nama Periode SPP Aktif</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Icon name="lock" size={11} /> Otomatis Mengikuti Periode Aktif
                  </span>
                </label>
                <input type="text" readOnly disabled value={formData.activePeriodName || `Periode ${formData.startMonth || 'Juli'} ${formData.startYear || 2025} - ${formData.endMonth || 'Juni'} ${formData.endYear || 2026}${formData.semester && formData.semester !== 'Semua' ? ` (${formData.semester})` : ''}`} placeholder="Otomatis mengikuti rentang periode" className="w-full px-3.5 py-2.5 bg-slate-100 border border-emerald-200 rounded-xl font-bold text-slate-600 cursor-not-allowed focus:outline-none" />
              </div>

              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Bulan Mulai</label>
                  <select value={formData.startMonth || 'Juli'} onChange={e => updateFormState({
              startMonth: e.target.value
            })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tahun Mulai</label>
                  <input type="number" value={formData.startYear || 2025} onChange={e => updateFormState({
              startYear: parseInt(e.target.value) || 2025
            })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Bulan Akhir</label>
                  <select value={formData.endMonth || 'Juni'} onChange={e => updateFormState({
              endMonth: e.target.value
            })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tahun Akhir</label>
                  <input type="number" value={formData.endYear || 2026} onChange={e => updateFormState({
              endYear: parseInt(e.target.value) || 2026
            })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Pilihan Semester</label>
                  <select value={formData.semester || 'Semua'} onChange={e => updateFormState({
              semester: e.target.value
            })} className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="Semua">Semua Semester (1 Tahun Penuh)</option>
                    <option value="Semester 1">Semester 1 (Ganjil)</option>
                    <option value="Semester 2">Semester 2 (Genap)</option>
                  </select>
                </div>
              </div>

              
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                  <Icon name="zap" size={13} className="text-amber-500" /> Set Cepat Rentang Semester:
                </span>
                <button type="button" onClick={() => {
            const y = formData.startYear || 2025;
            updateFormState({
              semester: 'Semester 1',
              startMonth: 'Juli',
              startYear: y,
              endMonth: 'Desember',
              endYear: y
            });
          }} className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${formData.semester === 'Semester 1' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                  Semester 1 (Juli - Des)
                </button>
                <button type="button" onClick={() => {
            const y = formData.startYear || 2025;
            const nextY = y + 1;
            updateFormState({
              semester: 'Semester 2',
              startMonth: 'Januari',
              startYear: nextY,
              endMonth: 'Juni',
              endYear: nextY
            });
          }} className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${formData.semester === 'Semester 2' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                  Semester 2 (Jan - Jun)
                </button>
                <button type="button" onClick={() => {
            const y = formData.startYear || 2025;
            updateFormState({
              semester: 'Semua',
              startMonth: 'Juli',
              startYear: y,
              endMonth: 'Juni',
              endYear: y + 1
            });
          }} className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${formData.semester === 'Semua' || !formData.semester ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                  1 Tahun Penuh (Juli - Jun)
                </button>
              </div>

              
              <div className="p-3 bg-white rounded-xl border border-emerald-200/70 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-extrabold mr-1">Rangkaian Bulan Tagihan:</span>
                  {getMonthsList(formData).slice(0, 4).join(', ')} ... {getMonthsList(formData).slice(-2).join(', ')}
                  <span className="ml-2 font-black text-emerald-700">({getMonthsList(formData).length} Bulan)</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded-lg text-[10px]">
                  <Icon name="tag" size={11} />
                  <span>{formData.semester || 'Semua Semester'}</span>
                </div>
              </div>

              
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="button" onClick={handleSaveCurrentAsPreset} className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-600/30">
                  <Icon name="check-circle" size={16} />
                  <span>Simpan & Terapkan Rentang Ini</span>
                </button>
                <p className="text-[11px] text-slate-500 font-medium">
                  Menyimpan rentang bulan & tahun ini ke daftar preset dan menerapkannya langsung ke sistem.
                </p>
              </div>

              
              <div className="pt-4 border-t border-emerald-100/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <Icon name="list" size={14} className="text-emerald-700" />
                      Daftar Pilihan Preset Periode Ajaran (Bisa Diisi & Disimpan ke Database)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kelola daftar preset periode tersimpan. Anda dapat mengedit nama & rentang periode langsung di bawah ini.
                    </p>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100 px-2.5 py-1 rounded-full">
                    {(formData.academicPeriods || []).length} Preset Tersimpan
                  </span>
                </div>

                
                <div className="space-y-3">
                  {formData.academicPeriods && formData.academicPeriods.length > 0 ? formData.academicPeriods.map((p, idx) => {
              const isSelected = p.isActive || formData.startMonth === p.startMonth && String(formData.startYear) === String(p.startYear) && formData.endMonth === p.endMonth && String(formData.endYear) === String(p.endYear) && (p.semester || 'Semua') === (formData.semester || 'Semua');
              return <div key={p.id || idx} className={`p-3.5 rounded-2xl border transition-all ${isSelected ? 'bg-emerald-100/80 border-emerald-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-[240px]">
                              <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                {idx + 1}
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Nama Preset Periode</label>
                                  <input type="text" value={p.name || ''} onChange={e => handleUpdatePresetField(idx, 'name', e.target.value)} placeholder="Nama Preset Periode" className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white text-xs" />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Mulai (Bulan & Thn)</label>
                                  <div className="flex gap-1">
                                    <select value={p.startMonth || 'Juli'} onChange={e => handleUpdatePresetField(idx, 'startMonth', e.target.value)} className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs">
                                      {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <input type="number" value={p.startYear || 2025} onChange={e => handleUpdatePresetField(idx, 'startYear', e.target.value)} className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs" />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Akhir & Semester</label>
                                  <div className="flex gap-1">
                                    <select value={p.endMonth || 'Juni'} onChange={e => handleUpdatePresetField(idx, 'endMonth', e.target.value)} className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs">
                                      {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <input type="number" value={p.endYear || 2026} onChange={e => handleUpdatePresetField(idx, 'endYear', e.target.value)} className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 justify-end pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                              <select value={p.semester || 'Semua'} onChange={e => handleUpdatePresetField(idx, 'semester', e.target.value)} className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 font-bold rounded-xl text-xs">
                                <option value="Semua">Semua Sem</option>
                                <option value="Semester 1">Semester 1</option>
                                <option value="Semester 2">Semester 2</option>
                              </select>

                              {isSelected ? <span className="px-3 py-1.5 bg-emerald-600 text-white font-black text-[10px] rounded-xl flex items-center gap-1 shadow-xs">
                                  <Icon name="check" size={12} /> Aktif
                                </span> : <button type="button" onClick={() => handleApplyPreset(p)} className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-300 rounded-xl text-[10px] transition-colors shadow-2xs">
                                  Terapkan
                                </button>}

                              <button type="button" onClick={() => handleDeletePreset(idx, p.name)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors" title="Hapus Preset">
                                <Icon name="trash-2" size={15} />
                              </button>
                            </div>
                          </div>
                        </div>;
            }) : <div className="p-4 bg-white rounded-xl border border-dashed border-emerald-200 text-center text-slate-400 text-xs">
                      Belum ada preset tersimpan di database. Gunakan form di bawah untuk menambah preset baru.
                    </div>}
                </div>

                
                <div className="p-4 bg-white rounded-2xl border border-emerald-200 space-y-3">
                  <h5 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <Icon name="plus-circle" size={15} className="text-emerald-600" />
                    Tambah Preset Periode Baru Manual
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div className="lg:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Nama Preset Periode</label>
                      <input type="text" placeholder="Contoh: Periode 2026/2027" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Bulan Mulai</label>
                      <select value={newPresetStartMonth} onChange={e => setNewPresetStartMonth(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs">
                        {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Tahun Mulai</label>
                      <input type="number" value={newPresetStartYear} onChange={e => setNewPresetStartYear(parseInt(e.target.value) || 2026)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Bulan Akhir</label>
                      <select value={newPresetEndMonth} onChange={e => setNewPresetEndMonth(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs">
                        {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Tahun Akhir</label>
                      <input type="number" value={newPresetEndYear} onChange={e => setNewPresetEndYear(parseInt(e.target.value) || 2027)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Semester:</label>
                      <select value={newPresetSemester} onChange={e => setNewPresetSemester(e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs">
                        <option value="Semua">Semua Semester</option>
                        <option value="Semester 1">Semester 1 (Ganjil)</option>
                        <option value="Semester 2">Semester 2 (Genap)</option>
                      </select>
                    </div>

                    <button type="button" onClick={handleAddPresetManual} className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm">
                      <Icon name="plus" size={14} /> + Tambah Preset Periode Baru
                    </button>
                  </div>
                </div>
              </div>
            </div>

            
            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-extrabold text-indigo-950 text-sm flex items-center gap-2">
                  <Icon name="credit-card" size={18} className="text-indigo-700" />
                  Integrasi Payment Gateway Midtrans
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${window.AppEnv?.midtransIsProduction ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                  Mode .env: {window.AppEnv?.midtransIsProduction ? 'Production' : 'Sandbox'}
                </span>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 text-[11px] text-slate-600 space-y-1 font-medium">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold text-slate-700">Alamat Snap JS (.env):</span>
                  <code className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-indigo-800">{window.AppEnv?.midtransSnapUrl || 'https://app.sandbox.midtrans.com/snap/snap.js'}</code>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold text-slate-700">Endpoint Backend API (.env):</span>
                  <code className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-indigo-800">
                    {getBackendApiEndpointUrl('midtransCreateTxEndpoint', '/api/midtrans/create-transaction')}
                  </code>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Midtrans Client Key</label>
                  <input type="text" value={formData.midtransClientKey || ''} onChange={e => {
              isDirtyRef.current = true;
              setFormData({
                ...formData,
                midtransClientKey: e.target.value
              });
            }} placeholder="SB-Mid-client-..." className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Midtrans Server Key</label>
                  <input type="password" value={formData.midtransServerKey || ''} onChange={e => {
              isDirtyRef.current = true;
              setFormData({
                ...formData,
                midtransServerKey: e.target.value
              });
            }} placeholder="SB-Mid-server-... (Utama di .env / .env.local)" className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>

            
            <div className="p-5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-4">
              <h3 className="font-extrabold text-teal-950 text-sm flex items-center gap-2">
                <Icon name="layers" size={18} className="text-teal-700" />
                Pengaturan Kelompok Kelas & Besaran Tarif SPP (Input Manual)
              </h3>
              <p className="text-xs text-slate-500">Anda dapat langsung mengedit nama kelas dan tarif SPP pada kolom di bawah ini, atau menambahkan kelas baru.</p>

              <div className="space-y-3">
                {(formData.customClasses || []).length > 0 ? formData.customClasses.map((cls, idx) => <div key={idx} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <span className="w-7 h-7 bg-teal-100 text-teal-800 rounded-lg font-black flex items-center justify-center text-xs shrink-0">{idx + 1}</span>
                        <input type="text" value={cls.name || ''} onChange={e => handleUpdateClass(idx, 'name', e.target.value)} placeholder="Nama Kelas" className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white text-xs" />
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-black text-slate-500 text-xs">Rp</span>
                          <input type="text" value={formatInputNumber(cls.tarif)} onChange={e => handleUpdateClass(idx, 'tarif', parseNumberOnly(e.target.value))} placeholder="0" className="w-36 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-emerald-700 text-right focus:bg-white focus:border-teal-500 focus:outline-none text-xs" />
                        </div>
                        <button type="button" onClick={() => handleDeleteClass(idx)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus Kelas">
                          <Icon name="trash-2" size={16} />
                        </button>
                      </div>
                    </div>) : <div className="p-4 bg-white rounded-xl border border-dashed border-teal-200 text-center text-slate-400 text-xs">
                    Belum ada kelas yang didaftarkan. Isi form di bawah ini untuk menambahkan kelas baru secara manual.
                  </div>}
              </div>

              <div className="pt-2 flex flex-wrap gap-2 items-center">
                <input type="text" placeholder="Nama Kelas Baru (Contoh: Kelas B2)" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900" />
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-black text-slate-500 text-sm">
                    Rp
                  </span>
                  <input type="text" placeholder="1.200.000" value={formatInputNumber(newClassTarif)} onChange={e => setNewClassTarif(parseNumberOnly(e.target.value))} className="w-40 pl-11 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl font-black text-slate-900 text-right focus:border-teal-500 focus:outline-none shadow-inner" />
                </div>
                <button type="button" onClick={handleAddClass} className="py-2 px-4 bg-teal-700 hover:bg-teal-800 text-white font-extrabold rounded-xl shadow-sm transition-all">
                  + Tambah Nama Kelas
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button type="submit" className="py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 text-sm">
                <Icon name="save" size={18} />
                <span>Simpan Seluruh Pengaturan</span>
              </button>
            </div>
          </form>
        </div>;
});
