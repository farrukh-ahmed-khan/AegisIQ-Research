function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function getUserRoles(user) {
  if (!user || typeof user !== 'object') return [];

  const directRoles = Array.isArray(user.roles) ? user.roles : [];
  const publicRoles =
    user.publicMetadata && Array.isArray(user.publicMetadata.roles)
      ? user.publicMetadata.roles
      : [];
  const privateRoles =
    user.privateMetadata && Array.isArray(user.privateMetadata.roles)
      ? user.privateMetadata.roles
      : [];
  const unsafeRoles =
    user.unsafeMetadata && Array.isArray(user.unsafeMetadata.roles)
      ? user.unsafeMetadata.roles
      : [];

  return [...directRoles, ...publicRoles, ...privateRoles, ...unsafeRoles]
    .map(normalizeRole)
    .filter(Boolean);
}

function hasRole(user, role) {
  const target = normalizeRole(role);
  if (!target) return false;
  return getUserRoles(user).includes(target);
}

function hasAnyRole(user, roles) {
  if (!Array.isArray(roles) || roles.length === 0) return false;
  return roles.some((role) => hasRole(user, role));
}

function isAdmin(user) {
  return hasAnyRole(user, ['admin', 'administrator', 'superadmin']);
}

function isAnalyst(user) {
  return hasAnyRole(user, ['analyst', 'senior-analyst', 'research', 'researcher']);
}

function isEditor(user) {
  return hasAnyRole(user, ['editor', 'publisher', 'content-manager']);
}

function canViewReport(user, report) {
  if (!report || typeof report !== 'object') return !!user;

  if (isAdmin(user)) return true;

  const visibility = String(report.visibility || 'private').toLowerCase();
  const authorId = report.authorId || report.userId || report.ownerId;
  const userId = user && (user.id || user.userId || user.clerkUserId);

  if (visibility === 'public' || visibility === 'published') return true;
  if (authorId && userId && String(authorId) === String(userId)) return true;
  if (isAnalyst(user) || isEditor(user)) return true;

  return false;
}

function canEditReport(user, report) {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const authorId = report && (report.authorId || report.userId || report.ownerId);
  const userId = user.id || user.userId || user.clerkUserId;

  if (authorId && userId && String(authorId) === String(userId)) return true;
  return isAnalyst(user) || isEditor(user);
}

function assertCanViewReport(user, report) {
  if (!canViewReport(user, report)) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }
}

function assertCanEditReport(user, report) {
  if (!canEditReport(user, report)) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }
}

export {
  getUserRoles,
  hasRole,
  hasAnyRole,
  isAdmin,
  isAnalyst,
  isEditor,
  canViewReport,
  canEditReport,
  assertCanViewReport,
  assertCanEditReport,
};
