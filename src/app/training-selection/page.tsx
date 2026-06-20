"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Globe, Target, Play, GraduationCap, Users, FileText, Video, Zap, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TrainingPermission } from "@/lib/types";

export default function TrainingSelectionPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<TrainingPermission>({
    toefl: true,
    toeflAcademicDiscussion: true,
    ielts: true,
    basic: true,
    youtuber: false
  });
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (user && !permissionsLoaded) {
      fetchUserPermissions();
    }
  }, [user, loading, router, permissionsLoaded]);

  const fetchUserPermissions = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.trainingPermissions) {
          setUserPermissions(userData.trainingPermissions);
        }
      }
      setPermissionsLoaded(true);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      setPermissionsLoaded(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  if (!user || !permissionsLoaded) {
    return null;
  }

  const handleTrainingSelect = (trainingType: string) => {
    switch (trainingType) {
      case "toefl":
        router.push("/dashboard");
        break;
      case "toefl-academic-discussion":
        router.push("/toefl-dashboard");
        break;
      case "ielts":
        router.push("/ielts-dashboard");
        break;
      case "basic":
        router.push("/basic-dashboard");
        break;
      case "youtuber":
        router.push("/youtuber-dashboard");
        break;
      default:
        break;
    }
  };

  const trainingOptions = [
    {
      id: 'toefl',
      icon: GraduationCap,
      title: 'TOEFL Integrated Task',
      color: 'blue',
      enabled: userPermissions.toefl
    },
    {
      id: 'toefl-academic-discussion',
      icon: Users,
      title: 'TOEFL Academic Discussion',
      color: 'blue',
      enabled: userPermissions.toeflAcademicDiscussion
    },
    {
      id: 'ielts',
      icon: GraduationCap,
      title: 'IELTSトレーニング',
      color: 'emerald',
      enabled: userPermissions.ielts
    },
    {
      id: 'basic',
      icon: FileText,
      title: 'Basicトレーニング',
      color: 'violet',
      enabled: userPermissions.basic
    },
    {
      id: 'youtuber',
      icon: Video,
      title: 'YouTube Learning',
      color: 'red',
      enabled: userPermissions.youtuber
    }
  ];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-3xl font-light text-gray-900 mb-4">
            トレーニングを選択してください
          </h1>
          <p className="text-lg text-gray-500">
            現在利用可能なトレーニングはこちらです
          </p>
          <div className="text-sm text-gray-400 mt-2 text-center">
            <div className="flex items-center justify-center gap-2">
              初めての方、もしくはトレーニングの使い方を確認したい人は
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              下の<HelpCircle className="w-4 h-4 inline" />から確認できます
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center space-x-12">
          {trainingOptions.map((option) => {
            const IconComponent = option.icon;
            const isHovered = hoveredCard === option.id;
            
            return (
              <div
                key={option.id}
                className="relative group"
                onMouseEnter={() => option.enabled && setHoveredCard(option.id)}
            onMouseLeave={() => setHoveredCard(null)}
                onClick={() => option.enabled && handleTrainingSelect(option.id)}
              >
                {/* モダンでスタイリッシュなアイコンデザイン */}
                <div 
                  className={`
                    relative w-20 h-20 rounded-2xl flex items-center justify-center 
                    transition-all duration-500 cursor-pointer group
                    ${option.enabled 
                      ? 'bg-white hover:bg-gray-50 hover:scale-110 hover:shadow-xl' 
                      : 'bg-gray-50 opacity-50 cursor-not-allowed'
                    }
                    shadow-lg hover:shadow-2xl
                  `}
                >
                  {/* 背景の装飾的な要素 */}
                  <div className={`
                    absolute inset-0 rounded-2xl opacity-10
                    ${option.enabled 
                      ? 'bg-gray-100' 
                      : 'bg-gray-200'
                    }
                  `}></div>
                  
                  {/* アイコン */}
                  <div className="relative z-10">
                    <IconComponent 
                      className={`
                        w-10 h-10 transition-all duration-300
                        ${option.enabled 
                          ? `text-${option.color}-600 group-hover:text-${option.color}-700 group-hover:scale-110` 
                          : 'text-gray-400'
                        }
                      `} 
                    />
                    {/* アイコンの光る効果 */}
                    {option.enabled && (
                      <div 
                        className="absolute inset-0 w-10 h-10 rounded-full opacity-30 group-hover:opacity-50 blur-sm transition-opacity duration-300"
                        style={{
                          background: option.color === 'blue' ? 'linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))' :
                                     option.color === 'emerald' ? 'linear-gradient(to right, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))' :
                                     option.color === 'violet' ? 'linear-gradient(to right, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.2))' :
                                     option.color === 'red' ? 'linear-gradient(to right, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))' :
                                     'transparent'
                        }}
                      ></div>
                    )}
                  </div>
                  
                  {/* ホバー時の光る効果 */}
                  {option.enabled && (
                    <div className={`
                      absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
                      bg-gradient-to-br from-white/20 to-transparent
                      transition-opacity duration-300
                    `}></div>
                  )}
                </div>

                {/* ホバー時のタイトル表示 */}
                {isHovered && option.enabled && (
                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-20 animate-in fade-in-0 zoom-in-95 duration-200">
                    <div className="bg-gray-900/95 backdrop-blur-sm text-white text-sm px-4 py-3 rounded-xl whitespace-nowrap shadow-2xl border border-gray-700/50">
                      <div className="font-medium">{option.title}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900/95"></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 使い方ガイドボタン */}
        <div className="flex justify-center mt-8">
          <div 
            className="relative group cursor-pointer"
            onClick={() => window.open('/usage-guide', '_blank')}
          >
            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 hover:scale-110 hover:shadow-xl transition-all duration-500 shadow-lg hover:shadow-2xl">
              {/* 背景の装飾的な要素 */}
              <div className="absolute inset-0 rounded-2xl opacity-20 bg-gradient-to-br from-gray-200 to-transparent"></div>
              
              {/* アイコン */}
              <div className="relative z-10">
                <HelpCircle className="w-10 h-10 text-gray-600 group-hover:text-gray-700 group-hover:scale-110 transition-all duration-300" />
                {/* アイコンの光る効果 */}
                <div className="absolute inset-0 w-10 h-10 rounded-full opacity-0 group-hover:opacity-100 bg-gradient-to-r from-gray-400/20 to-gray-600/20 blur-sm transition-opacity duration-300"></div>
              </div>
              
              {/* ホバー時の光る効果 */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-white/20 to-transparent transition-opacity duration-300"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
