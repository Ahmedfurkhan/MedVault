// Gate an endpoint to authenticated users whose role is 'doctor'.
export default function requireDoctor(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated())
    return res.status(401).json({ error: 'Unauthorized.' });
  if (req.user?.role !== 'doctor') return res.status(403).json({ error: 'Doctor access only.' });
  next();
}
