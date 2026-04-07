'use client';

import React from 'react';

interface Video {
  url: string;
  title: string;
  description: string;
}

interface VideoTutorialsProps {
  title: string;
  subtitle: string;
  videos: Video[];
}

export default function VideoTutorials({ title, subtitle, videos }: VideoTutorialsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-rose-100">
      <section>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 font-['Playfair_Display']">
          {title}
        </h2>
        <p className="text-gray-600 mb-8">
          {subtitle}
        </p>

        <div className="grid gap-12">
          {videos.map((video, index) => (
            <div key={index} className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="w-full lg:w-3/5 aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-100 bg-gray-50">
                <iframe
                  src={video.url}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={video.title}
                />
              </div>
              <div className="w-full lg:w-2/5">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{video.title}</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {video.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
