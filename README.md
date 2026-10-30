# Sanyam Singh, portfolio

Next.js and React Three Fiber. A soft figure in a maroon muffler walks visitors through the work.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Add your content

Everything lives in `content/portfolio.ts`. The page and the figure's answers both read from that file.

- **Project media and links:** put files in `public/projects/`, then set `image`, `shots`, `liveUrl` and `sourceUrl` on the project. Each appears as soon as it is set.
- **LinkedIn and GitHub:** add your addresses as `href` on the contact rows. A row stays hidden until it has one.
- **Résumé:** replace `public/Sanyam-Singh-Resume.pdf` (currently a placeholder page).
- **Skills:** a project's `skills` must use the same names as `skillGroups`, or clicking a skill won't find it.
- **Lead project:** the first project in the list gets the large "Start here" tile.
- **Sharing preview:** set `NEXT_PUBLIC_SITE_URL` to your live address when you deploy.
- **Links:** set `href` on the contact rows and `liveUrl` / `sourceUrl` on projects. Rows and buttons without a link show as plain text or stay hidden.

## How it is organised

- `figure/avatar.ts`: the figure's behaviour (walking, reactions, drag and throw). No React.
- `figure/shader.ts`: how the figure, muffler and stairs are drawn.
- `components/Stage.tsx`: connects the two and moves the signs, marks and grab area.
- `components/Portfolio.tsx`: the page, the project catch, and the conversation.
- `lib/assistant.ts`: answers questions from `content/portfolio.ts` only, using keyword matching.
