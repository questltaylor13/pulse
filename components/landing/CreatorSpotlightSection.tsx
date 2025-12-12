import Link from "next/link";
import Image from "next/image";

interface SpotlightCreator {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  profileImageUrl: string | null;
  profileColor: string | null;
  isFounder: boolean;
  isDenverNative: boolean | null;
  yearsInDenver: number | null;
  specialties: string[];
  vibeDescription: string | null;
}

interface CreatorSpotlightSectionProps {
  creator: SpotlightCreator | null;
}

export default function CreatorSpotlightSection({ creator }: CreatorSpotlightSectionProps) {
  if (!creator) {
    return null;
  }

  return (
    <section className="landing-section bg-primary text-white">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Content */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium mb-4">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Meet the Founder
              </span>

              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {creator.displayName}
              </h2>

              <p className="text-lg text-white/90 mb-6 leading-relaxed">
                {creator.vibeDescription || creator.bio}
              </p>

              {/* Denver cred */}
              <div className="flex items-center gap-4 mb-6 text-sm">
                {creator.isDenverNative ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Denver Native
                  </span>
                ) : creator.yearsInDenver ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {creator.yearsInDenver}+ years in Denver
                  </span>
                ) : null}
              </div>

              {/* Specialties */}
              {creator.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {creator.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/influencers/${creator.handle}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-md hover:shadow-lg transition"
                >
                  View Profile
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/influencers"
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-white/50 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                  Meet All Creators
                </Link>
              </div>
            </div>

            {/* Image */}
            <div className="relative flex justify-center md:justify-end">
              <div
                className="relative h-72 w-72 md:h-80 md:w-80 rounded-2xl overflow-hidden shadow-2xl"
                style={{ backgroundColor: creator.profileColor || "#F5EDE6" }}
              >
                {creator.profileImageUrl ? (
                  <Image
                    src={creator.profileImageUrl}
                    alt={creator.displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-6xl font-bold text-slate-400">
                    {creator.displayName.charAt(0)}
                  </div>
                )}

                {/* Founder badge */}
                {creator.isFounder && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/95 backdrop-blur rounded-lg p-3 shadow-lg">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-amber-500" />
                        <span className="text-sm font-semibold text-slate-900">Pulse Founder</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
