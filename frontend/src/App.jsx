import { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.test-token'

const demoProjects = [
  {
    id: 1,
    name: 'Amazon Restoration',
    description: 'Reforestation and biodiversity corridor across critical habitat zones in the Amazon basin.',
    status: 'active',
    created_at: '2024-01-10T00:00:00',
    sites: [
      {
        id: 1,
        name: 'North Block',
        polygon: [
          [-73.994, 40.72],
          [-73.99, 40.72],
          [-73.99, 40.76],
          [-73.994, 40.76],
        ],
        carbon_score: 72,
        biodiversity_score: 81,
      },
      {
        id: 2,
        name: 'River Edge',
        polygon: [
          [-73.985, 40.708],
          [-73.978, 40.708],
          [-73.978, 40.718],
          [-73.985, 40.718],
        ],
        carbon_score: 76,
        biodiversity_score: 84,
      },
    ],
  },
  {
    id: 2,
    name: 'Coastal Wetlands',
    description: 'Mangrove resilience program focused on coastal defense and ecosystem regeneration.',
    status: 'monitoring',
    created_at: '2024-02-02T00:00:00',
    sites: [
      {
        id: 3,
        name: 'Delta Reach',
        polygon: [
          [-74.01, 40.7],
          [-73.98, 40.7],
          [-73.98, 40.73],
          [-74.01, 40.73],
        ],
        carbon_score: 68,
        biodiversity_score: 75,
      },
    ],
  },
]

const getDefaultData = () => ({
  access_token: '',
  user: null,
  projects: demoProjects,
})

const formatScore = (value) => `${Math.round(value)}%`

function App() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const [auth, setAuth] = useState(getDefaultData())
  const [selectedProject, setSelectedProject] = useState(demoProjects[0])
  const [loginForm, setLoginForm] = useState({ email: 'admin@example.com', password: 'secret123' })
  const [registerForm, setRegisterForm] = useState({ name: 'Admin User', email: 'admin@example.com', password: 'secret123' })
  const [statusMessage, setStatusMessage] = useState('')

  const mapFeatures = useMemo(
    () =>
      (selectedProject?.sites || []).map((site) => ({
        type: 'Feature',
        properties: { name: site.name, project: selectedProject.name },
        geometry: {
          type: 'Polygon',
          coordinates: [site.polygon.map(([lng, lat]) => [lng, lat])],
        },
      })),
    [selectedProject],
  )

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-73.995, 40.73],
      zoom: 11,
    })

    mapRef.current.on('load', () => {
      mapRef.current.addSource('sites', { type: 'geojson', data: { type: 'FeatureCollection', features: mapFeatures } })
      mapRef.current.addLayer({
        id: 'site-layer',
        type: 'fill',
        source: 'sites',
        paint: {
          'fill-color': '#29b36a',
          'fill-opacity': 0.52,
        },
      })
      mapRef.current.addLayer({
        id: 'site-outline',
        type: 'line',
        source: 'sites',
        paint: { 'line-color': '#0f7d4c', 'line-width': 2 },
      })
    })

    return () => mapRef.current?.remove()
  }, [])

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getSource('sites')) return

    const source = mapRef.current.getSource('sites')
    source.setData({ type: 'FeatureCollection', features: mapFeatures })

    if (mapFeatures.length) {
      const allCoords = mapFeatures.flatMap((feature) => feature.geometry.coordinates[0])
      const bounds = new mapboxgl.LngLatBounds(allCoords[0], allCoords[0])
      allCoords.forEach((coord) => bounds.extend(coord))
      mapRef.current.fitBounds(bounds, { padding: 30 })
    }
  }, [mapFeatures])

  const chartData = useMemo(() => ({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Carbon',
        data: [62, 70, 68, 76, 84, 88],
        borderColor: '#25b36a',
        backgroundColor: 'rgba(37, 179, 106, 0.18)',
        tension: 0.4,
      },
      {
        label: 'Biodiversity',
        data: [55, 60, 66, 72, 78, 81],
        borderColor: '#4aa5ff',
        backgroundColor: 'rgba(74, 165, 255, 0.18)',
        tension: 0.4,
      },
    ],
  }), [])

  const handleRegister = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Registration failed')
      setAuth({ access_token: payload.access_token, user: payload.user, projects: demoProjects })
      setStatusMessage('Registration successful.')
    } catch (error) {
      setStatusMessage(error.message)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Login failed')
      setAuth({ access_token: payload.access_token, user: payload.user, projects: demoProjects })
      setStatusMessage('Login successful.')
    } catch (error) {
      setStatusMessage(error.message)
    }
  }

  const handleProjectCreate = async (event) => {
    event.preventDefault()
    const newProject = {
      id: Date.now(),
      name: 'New Forest Plot',
      description: 'Community-led carbon offset initiative built around restoration and biodiversity gains.',
      status: 'active',
      created_at: new Date().toISOString(),
      sites: [
        {
          id: Date.now() + 1,
          name: 'New Site',
          polygon: [
            [-73.998, 40.71],
            [-73.989, 40.71],
            [-73.989, 40.75],
            [-73.998, 40.75],
          ],
          carbon_score: 82,
          biodiversity_score: 79,
        },
      ],
    }

    const nextProjects = [newProject, ...auth.projects]
    setAuth((current) => ({ ...current, projects: nextProjects }))
    setSelectedProject(newProject)
    setStatusMessage('Project created successfully.')
  }

  const averageCarbon = selectedProject?.sites?.reduce((sum, site) => sum + site.carbon_score, 0) / (selectedProject?.sites?.length || 1)
  const averageBiodiversity = selectedProject?.sites?.reduce((sum, site) => sum + site.biodiversity_score, 0) / (selectedProject?.sites?.length || 1)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">D</div>
          <div>
            <div className="brand">Darukaa.Earth</div>
            <p className="subtitle">Carbon & biodiversity intelligence</p>
          </div>
        </div>

        <div className="auth-panel panel-box">
          <div className="section-heading">
            <h3>Account</h3>
          </div>
          {!auth.user ? (
            <div className="auth-grid">
              <form onSubmit={handleRegister}>
                <h4>Register</h4>
                <input value={registerForm.name} onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} placeholder="Name" />
                <input value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} placeholder="Email" />
                <input type="password" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} placeholder="Password" />
                <button type="submit">Create account</button>
              </form>
              <form onSubmit={handleLogin}>
                <h4>Login</h4>
                <input value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} placeholder="Email" />
                <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Password" />
                <button type="submit">Login</button>
              </form>
            </div>
          ) : (
            <div className="user-card">
              <strong>{auth.user.name}</strong>
              <p>{auth.user.email}</p>
            </div>
          )}
          {statusMessage && <p className="status">{statusMessage}</p>}
        </div>

        <div className="tasks panel-box">
          <div className="section-heading">
            <h3>Projects</h3>
            <span>{auth.projects.length}</span>
          </div>
          {auth.projects.map((project) => (
            <button key={project.id} className={`project-button ${selectedProject?.id === project.id ? 'selected' : ''}`} onClick={() => setSelectedProject(project)}>
              <div>
                <span>{project.name}</span>
                <small>{project.sites.length} sites</small>
              </div>
              <em>{project.status}</em>
            </button>
          ))}
        </div>

        <form onSubmit={handleProjectCreate} className="create-form">
          <button type="submit">Add project + new site</button>
        </form>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Project overview</p>
            <h1>{selectedProject?.name}</h1>
          </div>
          <div className="chip">{selectedProject?.status}</div>
        </header>

        <section className="hero-panel panel-box">
          <div>
            <p className="eyebrow subtle">Portfolio summary</p>
            <h2>{selectedProject?.description}</h2>
          </div>
          <div className="mini-actions">
            <button className="secondary">Export report</button>
            <button>Review project</button>
          </div>
        </section>

        <section className="summary-grid">
          <div className="stat-card panel-box">
            <span>Project sites</span>
            <strong>{selectedProject?.sites?.length || 0}</strong>
            <small>Active geographies</small>
          </div>
          <div className="stat-card panel-box">
            <span>Carbon score</span>
            <strong>{formatScore(averageCarbon || 0)}</strong>
            <small>Avg. emissions impact</small>
          </div>
          <div className="stat-card panel-box">
            <span>Biodiversity</span>
            <strong>{formatScore(averageBiodiversity || 0)}</strong>
            <small>Species resilience</small>
          </div>
        </section>

        <section className="map-card panel-box">
          <div className="section-heading">
            <h3>Geospatial footprint</h3>
            <span>Live map</span>
          </div>
          <div ref={mapContainer} className="map" />
        </section>

        <section className="content-grid">
          <div className="panel panel-box">
            <div className="section-heading">
              <h3>Site analytics</h3>
              <span>{selectedProject?.sites?.length || 0} zones</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Carbon</th>
                  <th>Biodiversity</th>
                </tr>
              </thead>
              <tbody>
                {selectedProject?.sites?.map((site) => (
                  <tr key={site.id}>
                    <td>{site.name}</td>
                    <td>{formatScore(site.carbon_score)}</td>
                    <td>{formatScore(site.biodiversity_score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel panel-box">
            <div className="section-heading">
              <h3>Performance over time</h3>
              <span>6 month trend</span>
            </div>
            <div className="chart-wrap">
              <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
