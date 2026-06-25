import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { Shield, TrendingUp, Zap } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const QUESTIONS = [
  {
    question: 'If your ₦500,000 investment dropped 15% in value in one month, what would you do?',
    options: [
      { label: 'Withdraw all funds immediately', score: 1 },
      { label: 'Hold and monitor closely', score: 2 },
      { label: 'Add more capital to buy at a lower price', score: 3 },
    ],
  },
  {
    question: 'How long are you comfortable leaving money invested before needing it back?',
    options: [
      { label: 'Less than 3 months', score: 1 },
      { label: '3 to 12 months', score: 2 },
      { label: 'Over 1 year', score: 3 },
    ],
  },
  {
    question: 'How stable is your monthly income?',
    options: [
      { label: 'Very stable — same amount every month', score: 3 },
      { label: 'Mostly stable with small variations', score: 2 },
      { label: 'Varies significantly month to month', score: 1 },
    ],
  },
  {
    question: 'Have you invested money before (stocks, treasury bills, savings schemes, cooperatives)?',
    options: [
      { label: 'Never', score: 1 },
      { label: 'Once or twice', score: 2 },
      { label: 'Regularly', score: 3 },
    ],
  },
  {
    question: 'Which matters more to you when investing?',
    options: [
      { label: 'I want to protect what I have', score: 1 },
      { label: 'I want a balance of safety and growth', score: 2 },
      { label: 'I want maximum growth even if it means more risk', score: 3 },
    ],
  },
];

const TIERS = [
  {
    minScore: 5,
    maxScore: 9,
    name: 'Conservative',
    icon: Shield,
    color: '#3B82F6',
    bg: '#DBEAFE',
    description:
      "We'll prioritise low-risk, steady-return businesses for you. Your capital protection is the first priority.",
  },
  {
    minScore: 10,
    maxScore: 14,
    name: 'Balanced',
    icon: TrendingUp,
    color: colors.ventureroot.green,
    bg: '#D1FAE5',
    description:
      "We'll show you a mix of established and growing businesses. Moderate risk, solid returns.",
  },
  {
    minScore: 15,
    maxScore: 15,
    name: 'Aggressive',
    icon: Zap,
    color: '#F59E0B',
    bg: '#FEF3C7',
    description:
      "You're comfortable with higher risk for higher reward. We'll surface high-growth opportunities.",
  },
];

const WorkerRiskAssessmentScreen = () => {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const totalScore = answers.reduce((sum, s) => sum + s, 0);
  const tier = TIERS.find((t) => totalScore >= t.minScore && totalScore <= t.maxScore) || TIERS[2];

  if (showResult) {
    const Icon = tier.icon;
    return (
      <OnboardingShell
        currentStep={step}
        totalSteps={total}
        title="Your Risk Profile"
        scrollable={false}
        footer={
          <View style={{ gap: 10 }}>
            <OnboardingButton
              title="Continue"
              onPress={() => goNext({ riskProfile: tier.name, riskScore: totalScore })}
            />
            <TouchableOpacity
              onPress={() => {
                setCurrentQ(0);
                setAnswers([]);
                setShowResult(false);
              }}
              style={{ paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>
                This doesn't feel right — retake quiz
              </Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: tier.bg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Icon size={36} color={tier.color} />
          </View>

          <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
            {tier.name}
          </Text>

          <View
            style={{
              backgroundColor: tier.bg,
              paddingHorizontal: 14,
              paddingVertical: 4,
              borderRadius: 20,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: tier.color }}>
              Score: {totalScore}/15
            </Text>
          </View>

          <Text
            style={{
              fontSize: 15,
              color: '#475569',
              textAlign: 'center',
              lineHeight: 22,
              paddingHorizontal: 8,
            }}
          >
            {tier.description}
          </Text>
        </View>
      </OnboardingShell>
    );
  }

  const q = QUESTIONS[currentQ];

  const handleAnswer = (score: number) => {
    const newAnswers = [...answers, score];
    setAnswers(newAnswers);

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowResult(true);
    }
  };

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Risk Assessment"
      subtitle="This helps us show you the right businesses to invest in. No wrong answers."
      onBack={() => {
        if (currentQ > 0) {
          setCurrentQ(currentQ - 1);
          setAnswers(answers.slice(0, -1));
        } else {
          goBack();
        }
      }}
    >
      <View
        style={{
          backgroundColor: '#F1F5F9',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 4,
          alignSelf: 'flex-start',
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
          Question {currentQ + 1} of {QUESTIONS.length}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#0F172A',
          lineHeight: 26,
          marginBottom: 24,
        }}
      >
        {q.question}
      </Text>

      <View style={{ gap: 10 }}>
        {q.options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => handleAnswer(opt.score)}
            activeOpacity={0.7}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 18,
              borderRadius: 14,
              backgroundColor: '#FFFFFF',
              borderWidth: 1.5,
              borderColor: '#E2E8F0',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#334155', lineHeight: 21 }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </OnboardingShell>
  );
};

export default WorkerRiskAssessmentScreen;
