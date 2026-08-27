const fullProfileFixture = {
  data: {
    entityUrn: "urn:li:collectionResponse:test",
    "*elements": ["urn:li:fsd_profile:ACoAAAEkwwAB9KEc2TrQgOLEQ-vzRyZeCDyc6DQ"],
    $type: "com.linkedin.restli.common.CollectionResponse",
  },
  included: [
    {
      entityUrn: "urn:li:fsd_profile:ACoAAAEkwwAB9KEc2TrQgOLEQ-vzRyZeCDyc6DQ",
      $type: "com.linkedin.voyager.dash.identity.profile.Profile",
      firstName: "Satya",
      multiLocaleLastName: { en_US: "Nadella" },
      headline: "Chairman and CEO at Microsoft",
      multiLocaleHeadline: { en_US: "Chairman and CEO at Microsoft" },
      summary: "As chairman and CEO of Microsoft.",
      multiLocaleSummary: { en_US: "As chairman and CEO of Microsoft." },
      publicIdentifier: "satyanadella",
      geoLocation: {
        geoUrn: "urn:li:fsd_geo:104145663",
        $type: "com.linkedin.voyager.dash.identity.profile.ProfileGeoLocation",
      },
      profilePicture: {
        displayImageReference: {
          vectorImage: {
            rootUrl: "https://media.licdn.com/dms/image/C5603AQ/test/profile-displayphoto-shrink_",
            artifacts: [
              { width: 100, fileIdentifyingUrlPathSegment: "100_100/photo.jpg" },
              { width: 400, fileIdentifyingUrlPathSegment: "400_400/photo.jpg" },
            ],
          },
        },
      },
      backgroundPicture: {
        displayImageReference: {
          vectorImage: {
            rootUrl: "https://media.licdn.com/bg/",
            artifacts: [{ width: 1400, fileIdentifyingUrlPathSegment: "1400_1400/banner.jpg" }],
          },
        },
      },
    },
    {
      entityUrn: "urn:li:fsd_geo:104145663",
      $type: "com.linkedin.voyager.dash.common.Geo",
      defaultLocalizedName: "Redmond, Washington, United States",
    },
    {
      entityUrn: "urn:li:fsd_profilePosition:(ACoAAAEkwwAB9KEc2TrQgOLEQ-vzRyZeCDyc6DQ,505656746)",
      $type: "com.linkedin.voyager.dash.identity.profile.Position",
      title: "Chairman and CEO",
      multiLocaleTitle: { en_US: "Chairman and CEO" },
      companyName: "Microsoft",
      multiLocaleCompanyName: { en_US: "Microsoft" },
      companyUrn: "urn:li:fsd_company:1035",
      locationName: "Greater Seattle Area",
      multiLocaleGeoLocationName: { en_US: "Greater Seattle Area" },
      dateRange: {
        start: { month: 2, year: 2014, $type: "com.linkedin.common.Date" },
        $type: "com.linkedin.common.DateRange",
      },
    },
    {
      entityUrn: "urn:li:fsd_profilePosition:(ACoAAAEkwwAB9KEc2TrQgOLEQ-vzRyZeCDyc6DQ,2057886223)",
      $type: "com.linkedin.voyager.dash.identity.profile.Position",
      title: "Chairman",
      multiLocaleTitle: { en_US: "Chairman" },
      companyName: "The Business Council U.S.",
      multiLocaleCompanyName: { en_US: "The Business Council U.S." },
      companyUrn: "urn:li:fsd_company:5301945",
      locationName: null,
      dateRange: {
        start: { year: 2021, $type: "com.linkedin.common.Date" },
        end: { year: 2023, $type: "com.linkedin.common.Date" },
        $type: "com.linkedin.common.DateRange",
      },
    },
    {
      entityUrn: "urn:li:fsd_company:1035",
      $type: "com.linkedin.voyager.dash.organization.Company",
      url: "https://www.linkedin.com/company/microsoft/",
    },
    {
      entityUrn: "urn:li:fsd_profileEducation:(ACoAAAEkwwAB9KEc2TrQgOLEQ-vzRyZeCDyc6DQ,287943982)",
      $type: "com.linkedin.voyager.dash.identity.profile.Education",
      degreeName: "Bachelor's Degree",
      multiLocaleDegreeName: { en_US: "Bachelor's Degree" },
      fieldOfStudy: "Electrical Engineering",
      multiLocaleFieldOfStudy: { en_US: "Electrical Engineering" },
      schoolName: "Manipal Institute of Technology, Manipal",
      multiLocaleSchoolName: { en_US: "Manipal Institute of Technology, Manipal" },
      dateRange: null,
    },
  ],
};

const skillsFixture = {
  data: {
    entityUrn: "urn:li:collectionResponse:testskill",
    "*elements": ["urn:li:fsd_profileSkill:(test,1)"],
    paging: { count: 50, start: 0, total: 1, links: [] },
    $type: "com.linkedin.restli.common.CollectionResponse",
  },
  included: [
    {
      entityUrn: "urn:li:fsd_profileSkill:(test,1)",
      $type: "com.linkedin.voyager.dash.identity.profile.Skill",
      name: "JavaScript",
      endorsementCount: 42,
    },
  ],
};

const languagesFixture = {
  data: {
    entityUrn: "urn:li:collectionResponse:testlang",
    "*elements": ["urn:li:fsd_profileLanguage:(test,english)"],
    paging: { count: 50, start: 0, total: 1, links: [] },
    $type: "com.linkedin.restli.common.CollectionResponse",
  },
  included: [
    {
      entityUrn: "urn:li:fsd_profileLanguage:(test,english)",
      $type: "com.linkedin.voyager.dash.identity.profile.Language",
      name: "English",
      proficiency: "NATIVE_OR_BILINGUAL",
    },
  ],
};

module.exports = { fullProfileFixture, skillsFixture, languagesFixture };