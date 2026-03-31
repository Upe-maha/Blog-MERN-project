"use client";

import { useState, useEffect } from "react";
import Link from "next/link";


export default function HomePage() {


  return (
    <div>
      <div
        className="min-h-screen w-full bg-cover bg-center bg-fixed my-20 flex flex-col gap-10 "
      >

        {/* HERO SECTION */}
        <section className="py-28 text-white bg-blue-500/40 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl shadow-black/30">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold mb-8">
              Your Stories Matter
            </h1>

            <p className="text-lg md:text-xl mb-10 text-indigo-100 max-w-2xl mx-auto">
              A platform for creators to share ideas, connect with readers, and
              build a community around their content.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/blogs"
                className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold hover:bg-indigo-50 transition"
              >
                Browse Articles
              </Link>

              <Link
                href="/register"
                className="border-2 border-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-indigo-600 transition"
              >
                Join Now
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-24 bg-white/40 backdrop-blur-md rounded-lg border border-white/20 shadow-xl shadow-black/20">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
              What Makes Us Different
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <FeatureCard
                icon="📝"
                title="Effortless Writing"
                description="Our clean editor lets you focus on your content without distractions."
              />
              <FeatureCard
                icon="🤝"
                title="Build Connections"
                description="Engage with your audience through comments, likes, and shares."
              />
              <FeatureCard
                icon="⚡"
                title="Lightning Fast"
                description="Modern architecture ensures your content loads instantly."
              />
            </div>
          </div>
        </section>
      </div>

      {/* CTA SECTION */}
      <section className="py-24 text-white bg-gray-900/40 backdrop-blur-sm rounded-lg border border-white/20 shadow-xl shadow-black/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Start Your Journey Today
          </h2>

          <p className="text-gray-300 mb-10 text-lg">
            Join our growing community of writers and readers.
          </p>

          <Link
            href="/register"
            className="bg-indigo-600 px-10 py-4 rounded-xl font-bold hover:bg-indigo-700 transition inline-block"
          >
            Create Your Account
          </Link>
        </div>
      </section>
    </div>

  );
}

type FeatureProps = {
  icon: string;
  title: string;
  description: string;
};

function FeatureCard({ icon, title, description }: FeatureProps) {
  return (
    <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition">
      <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">{icon}</span>
      </div>

      <h3 className="text-2xl font-bold mb-3 text-gray-800">{title}</h3>

      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}