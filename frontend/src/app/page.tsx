'use client';

import { Briefcase, Users, Award, ArrowRight, Building2, Shield, Heart } from 'lucide-react';

export default function HomePage() {
  const logoUrl = 'https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <img
              src={logoUrl}
              alt="Hartzell Logo"
              className="h-10 w-auto"
            />
            <a
              href="/login"
              className="text-hartzell-blue hover:text-blue-700 font-medium transition-colors"
            >
              Employee Login →
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
            Build Your Career with
            <span className="block mt-6 md:mt-8">
              <img
                src={logoUrl}
                alt="Hartzell Companies"
                className="w-auto mx-auto"
                style={{ height: 'clamp(120px, 20vw, 280px)' }}
              />
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A family-based company serving Florida with excellence in Painting, Windows & Doors, and Construction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/apply"
              className="btn btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2 group"
            >
              Apply Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#why-hartzell"
              className="btn btn-secondary text-lg px-8 py-4"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="card text-center">
            <div className="text-4xl font-bold text-hartzell-blue mb-2">3</div>
            <div className="text-gray-600">Divisions</div>
            <div className="text-sm text-gray-500 mt-2">Painting • Windows & Doors • Construction</div>
          </div>
          <div className="card text-center">
            <div className="text-4xl font-bold text-hartzell-blue mb-2">Family</div>
            <div className="text-gray-600">Based & Operated</div>
            <div className="text-sm text-gray-500 mt-2">Serving Florida for Generations</div>
          </div>
          <div className="card text-center">
            <div className="text-4xl font-bold text-hartzell-blue mb-2">100%</div>
            <div className="text-gray-600">Committed to Quality</div>
            <div className="text-sm text-gray-500 mt-2">Pride in Every Project</div>
          </div>
        </div>

        {/* Why Hartzell */}
        <div id="why-hartzell" className="mb-20">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Why Hartzell Companies?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-hartzell-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Career Growth</h3>
              <p className="text-gray-600">
                We invest in your future with training programs, mentorship, and clear advancement paths.
              </p>
            </div>

            <div className="card hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-hartzell-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Comprehensive Benefits</h3>
              <p className="text-gray-600">
                Health insurance, 401(k) matching, paid time off, and more to support you and your family.
              </p>
            </div>

            <div className="card hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-hartzell-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Family Values</h3>
              <p className="text-gray-600">
                Work with a family-based company that treats employees like family, not numbers. Your success is our success.
              </p>
            </div>

            <div className="card hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-hartzell-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Modern Facilities</h3>
              <p className="text-gray-600">
                Work with state-of-the-art equipment in safe, comfortable, and innovative environments.
              </p>
            </div>

            <div className="card hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-hartzell-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Recognition Programs</h3>
              <p className="text-gray-600">
                Your hard work doesn't go unnoticed. We celebrate achievements and reward excellence.
              </p>
            </div>

            <div className="card hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-hartzell-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Florida Strong</h3>
              <p className="text-gray-600">
                Join a locally-rooted company with deep ties to Florida communities. We've built our reputation here, and we're here to stay.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="card bg-gradient-to-br from-hartzell-blue to-blue-700 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Do You Take Pride in a Job Well Done?
          </h2>
          <p className="text-lg mb-6 text-blue-100 max-w-3xl mx-auto">
            We welcome professionals from all walks of life who are serious about their craft and committed to excellence.
            If you believe in doing quality work and treating every project with respect, we need to talk.
          </p>
          <p className="text-base mb-8 text-blue-200 max-w-2xl mx-auto">
            Our application is straightforward and respectful of your time—we know you're a professional,
            and we'll treat you like one from day one.
          </p>
          <a
            href="/apply"
            className="inline-flex items-center gap-2 bg-white text-hartzell-blue px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors group"
          >
            Start Your Application
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-gray-200 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Hartzell. All rights reserved.</p>
          <p className="text-sm mt-2">
            Equal Opportunity Employer | Drug-Free Workplace
          </p>
        </div>
      </div>
    </div>
  );
}
