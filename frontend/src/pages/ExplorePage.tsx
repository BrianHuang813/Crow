import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useUserSearch } from '../hooks/useUserSearch';
import { useSavedProjects } from '../hooks/useSavedProjects';
import { fetchProject } from '../api/projects';
import type { Project } from '../types/api';
import type { ListParams } from '../api/social';
import { ProjectCard } from '../components/ProjectCard';
import { UserResultCard } from '../components/UserResultCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import './ExplorePage.css';

type ExploreTab = 'projects' | 'users' | 'saved';

const PAGE_SIZE = 12;

const SORTS: { label: string; value: NonNullable<ListParams['sort']> }[] = [
  { label: 'Hot', value: 'momentum' },
  { label: 'New', value: 'recent' },
  { label: 'Top', value: 'territory' },
];

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const typeParam = searchParams.get('type');
  const tab: ExploreTab = typeParam === 'users' ? 'users' : typeParam === 'saved' ? 'saved' : 'projects';
  const sort = (searchParams.get('sort') as ListParams['sort']) ?? 'momentum';
  const tag = searchParams.get('tag') ?? undefined;
  const rawQuery = searchParams.get('q')?.trim() ?? '';
  const query = rawQuery.toLowerCase();
  const { data, isLoading, isError } = useProjects({ status: 'all', sort, tag, limit });
  const userSearch = useUserSearch(tab === 'users' ? rawQuery : '');

  const projects = useMemo(() => {
    const items = data?.items ?? [];
    if (!query) return items;
    return items.filter(project =>
      project.name.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query) ||
      project.tech_tags.some(projectTag => projectTag.toLowerCase().includes(query))
    );
  }, [data?.items, query]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of data?.items ?? []) {
      for (const projectTag of project.tech_tags) {
        counts.set(projectTag, (counts.get(projectTag) ?? 0) + 1);
      }
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
  }, [data?.items]);

  function updateParams(next: { sort?: string; tag?: string | null; q?: string; type?: ExploreTab }) {
    const params = new URLSearchParams(searchParams);
    if (next.type) {
      if (next.type === 'projects') params.delete('type');
      else params.set('type', next.type);
    }
    if (next.sort) params.set('sort', next.sort);
    if (next.tag === null) params.delete('tag');
    else if (next.tag) params.set('tag', next.tag);
    if (next.q !== undefined) {
      if (next.q.trim()) params.set('q', next.q);
      else params.delete('q');
    }
    setLimit(PAGE_SIZE);
    setSearchParams(params);
  }

  return (
    <main className="explore page-container">
      <section className="explore__intro">
        <div>
          <p className="eyebrow">Project directory</p>
          <h1>Explore the Grid</h1>
          <p>Discover active projects, compare momentum, and find builders competing for territory.</p>
        </div>
        {tab === 'projects' && (
          <div className="segmented-control" aria-label="Project sorting">
            {SORTS.map(option => (
              <button
                key={option.value}
                className={sort === option.value ? 'is-active' : ''}
                onClick={() => updateParams({ sort: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="segmented-control explore__tabs" aria-label="Search type">
        <button className={tab === 'projects' ? 'is-active' : ''} onClick={() => updateParams({ type: 'projects' })}>
          Projects
        </button>
        <button className={tab === 'users' ? 'is-active' : ''} onClick={() => updateParams({ type: 'users' })}>
          Builders
        </button>
        <button className={tab === 'saved' ? 'is-active' : ''} onClick={() => updateParams({ type: 'saved' })}>
          Saved
        </button>
      </div>

      <div className="explore__search">
        <Search size={18} />
        <input
          value={searchParams.get('q') ?? ''}
          onChange={event => updateParams({ q: event.target.value })}
          placeholder={tab === 'users' ? 'Search builders by handle…' : 'Search project names, descriptions, or tech...'}
          aria-label={tab === 'users' ? 'Search builders' : 'Filter projects'}
        />
      </div>

      {tab === 'projects' ? (
        <>
          <div className="explore__tags" aria-label="Technology filters">
            <button className={!tag ? 'is-active' : ''} onClick={() => updateParams({ tag: null })}>All technologies</button>
            {tags.map(item => (
              <button key={item} className={tag === item ? 'is-active' : ''} onClick={() => updateParams({ tag: item })}>
                {item}
              </button>
            ))}
          </div>

          {isError && <PageMessage>Projects are unavailable right now. Retrying shortly.</PageMessage>}
          {!isLoading && !isError && projects.length === 0 && <PageMessage>Nothing matches these filters yet.</PageMessage>}

          <section className="explore__grid" aria-label="Projects">
            {isLoading && <SkeletonGrid count={6} />}
            {projects.map((project: Project, i: number) => <ProjectCard key={project.id} project={project} index={i} />)}
          </section>

          {data && limit < data.total && (
            <button className="btn btn--outline explore__more" onClick={() => setLimit(current => current + PAGE_SIZE)}>
              Load more projects
            </button>
          )}
        </>
      ) : tab === 'users' ? (
        <>
          {!rawQuery && <PageMessage>Type a handle to find builders.</PageMessage>}
          {rawQuery && userSearch.isError && <PageMessage>Search is unavailable right now. Retrying shortly.</PageMessage>}
          {rawQuery && !userSearch.isLoading && !userSearch.isError && (userSearch.data?.items.length ?? 0) === 0 && (
            <PageMessage>No builders match “{rawQuery}”.</PageMessage>
          )}
          <section className="explore__users" aria-label="Builders">
            {rawQuery && userSearch.isLoading && <PageMessage>Searching…</PageMessage>}
            {userSearch.data?.items.map(user => <UserResultCard key={user.handle} user={user} />)}
          </section>
        </>
      ) : (
        <SavedProjects />
      )}
    </main>
  );
}

function PageMessage({ children }: { children: React.ReactNode }) {
  return <div className="page-message">{children}</div>;
}

function SavedProjects() {
  const { saved } = useSavedProjects();
  const results = useQueries({
    queries: saved.map(id => ({
      queryKey: ['project', id],
      queryFn: () => fetchProject(id),
      retry: false,
    })),
  });
  const projects = results.map(r => r.data).filter((p): p is Project => !!p);

  if (saved.length === 0) return <PageMessage>No saved projects yet. Tap the bookmark on any project to save it.</PageMessage>;
  return (
    <section className="explore__grid" aria-label="Saved projects">
      {projects.map((project, i) => <ProjectCard key={project.id} project={project} index={i} />)}
    </section>
  );
}
