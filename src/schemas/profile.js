const { z } = require("zod");

const ExperienceItemSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  duration: z.string().nullable(),
  description: z.string().nullable(),
  companyUrl: z.string().nullable(),
});

const EducationItemSchema = z.object({
  school: z.string().nullable(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  grade: z.string().nullable(),
  activities: z.string().nullable(),
});

const SkillItemSchema = z.object({
  name: z.string().nullable(),
  endorsements: z.number().nullable(),
});

const CertificationItemSchema = z.object({
  name: z.string().nullable(),
  issuer: z.string().nullable(),
  issueDate: z.string().nullable(),
  expiryDate: z.string().nullable(),
  credentialUrl: z.string().nullable(),
});

const LanguageItemSchema = z.object({
  language: z.string().nullable(),
  proficiency: z.string().nullable(),
});

const ProfileSchema = z.object({
  name: z.string().nullable(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  about: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  bannerImageUrl: z.string().nullable(),
  currentCompany: z.string().nullable(),
  followers: z.string().nullable(),
  experience: z.array(ExperienceItemSchema),
  education: z.array(EducationItemSchema),
  skills: z.array(SkillItemSchema),
  certifications: z.array(CertificationItemSchema),
  languages: z.array(LanguageItemSchema),
});

const ApiResponseSchema = z.object({
  success: z.boolean(),
  profile: ProfileSchema.nullable(),
  meta: z.object({
    sourceUrl: z.string(),
    cached: z.boolean(),
    scrapedAt: z.string().nullable(),
  }),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .nullable(),
});

module.exports = {
  ProfileSchema,
  ApiResponseSchema,
  ExperienceItemSchema,
  EducationItemSchema,
  SkillItemSchema,
  CertificationItemSchema,
  LanguageItemSchema,
};
