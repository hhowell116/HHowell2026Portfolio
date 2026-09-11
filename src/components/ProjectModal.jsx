import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { github } from "../assets";

// A Loom link can be copied in several shapes and only one of them renders in an
// iframe: the /embed/ one. Rather than require the right shape in constants, accept
// whatever Loom's Share button produced and convert it here.
//   https://www.loom.com/share/<id>?t=1  ->  https://www.loom.com/embed/<id>
//   https://www.loom.com/embed/<id>      ->  unchanged
//   <id>                                 ->  https://www.loom.com/embed/<id>
// Anything that is already some other provider's embed URL is passed through, so a
// YouTube or Drive embed still works.
const LOOM_ID = /^[0-9a-f]{32}$/i;

export const toEmbedUrl = (raw) => {
  if (!raw) return "";
  const url = String(raw).trim();

  if (LOOM_ID.test(url)) return `https://www.loom.com/embed/${url}`;

  const loom = url.match(
    /loom\.com\/(?:share|embed|v)\/([0-9a-zA-Z]+)/
  );
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;

  return url;
};

// Accept either the newer `videos: [{ url, caption }]` array or the original single
// `videoUrl`, and normalise both to one list so the markup below has one shape to render.
const videoList = (project) => {
  const many = Array.isArray(project.videos) ? project.videos : [];
  const entries = many.length
    ? many
    : project.videoUrl
    ? [{ url: project.videoUrl, caption: "" }]
    : [];

  return entries
    .map((v) => (typeof v === "string" ? { url: v, caption: "" } : v))
    .filter((v) => v && v.url)
    .map((v) => ({ ...v, url: toEmbedUrl(v.url) }));
};

const ProjectModal = ({ project, onClose }) => {
  const [activeVideo, setActiveVideo] = useState(0);
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Opening a different project must not inherit the previous one's selected clip.
  useEffect(() => {
    setActiveVideo(0);
  }, [project?.name]);

  if (!project) return null;

  const videos = videoList(project);
  const current = videos[Math.min(activeVideo, videos.length - 1)];

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-tertiary rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white text-2xl w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center z-20 transition-colors"
          >
            &times;
          </button>

          {/* Video Section — hidden until videos are added */}
          {current && (
            <div className="rounded-t-2xl overflow-hidden">
              <div className="w-full aspect-video bg-black-100">
                <iframe
                  key={current.url}
                  src={current.url}
                  title={`${project.name} — ${current.caption || "walkthrough"}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* One button per clip. Only worth showing when there is a choice to make. */}
              {videos.length > 1 && (
                <div className="bg-black-100 px-4 pb-4 pt-1">
                  <div className="flex flex-wrap gap-2">
                    {videos.map((v, i) => (
                      <button
                        key={v.url}
                        onClick={() => setActiveVideo(i)}
                        aria-current={i === activeVideo}
                        className={`px-3 py-1.5 text-[13px] rounded-full border transition-colors ${
                          i === activeVideo
                            ? "bg-[#915EFF] text-white border-transparent"
                            : "bg-black-200 text-secondary border-white/10 hover:text-white hover:border-white/30"
                        }`}
                      >
                        {v.caption || `Clip ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {videos.length === 1 && current.caption && (
                <div className="bg-black-100 px-4 pb-4 pt-2">
                  <p className="text-secondary text-[13px]">{current.caption}</p>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            <h2 className="text-white font-bold text-[28px]">{project.name}</h2>

            <p className="mt-3 text-secondary text-[15px] leading-[26px] whitespace-pre-line">
              {project.detailedDescription || project.description}
            </p>

            {/* Data Integration */}
            {project.dataIntegration && (
              <div className="mt-5 p-4 bg-black-200 rounded-xl border border-white/10">
                <h3 className="text-white font-semibold text-[16px] mb-2">Data Integration</h3>
                <p className="text-secondary text-[14px] leading-[22px] whitespace-pre-line">
                  {project.dataIntegration}
                </p>
              </div>
            )}

            {/* Tech Stack */}
            {project.techStack && project.techStack.length > 0 && (
              <div className="mt-5">
                <h3 className="text-white font-semibold text-[16px] mb-3">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 bg-black-200 text-secondary text-[13px] rounded-full border border-white/10"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              {project.source_code_link && (
                <a
                  href={project.source_code_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-black-200 text-white rounded-xl hover:bg-black-100 transition-colors text-[14px]"
                >
                  <img src={github} alt="github" className="w-5 h-5" />
                  Source Code
                </a>
              )}
              {project.liveDemo && (
                <a
                  href={project.liveDemo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#915EFF] text-white rounded-xl hover:bg-[#7a4ee0] transition-colors text-[14px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {project.liveDemoLabel || "Live Demo"}
                </a>
              )}
            </div>
          </div>

          {/* Screenshots — vertical stacked with captions */}
          {project.images && project.images.length > 0 && (
            <div className="px-6 pb-6 flex flex-col gap-5">
              <h3 className="text-white font-semibold text-[16px]">Screenshots</h3>
              {project.images.map((item, i) => {
                const src = item.src || item;
                const caption = item.caption || null;
                return (
                  <div key={i}>
                    <img
                      src={src}
                      alt={`${project.name} screenshot ${i + 1}`}
                      className="w-full rounded-xl border border-white/10"
                    />
                    {caption && (
                      <p className="mt-2 text-secondary text-[13px] leading-[20px] opacity-80">
                        {caption}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Single image fallback for projects without gallery */}
          {(!project.images || project.images.length === 0) && project.image && (
            <div className="px-6 pb-6">
              <img
                src={project.image}
                alt={project.name}
                className="w-full rounded-xl border border-white/10"
              />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ProjectModal;
