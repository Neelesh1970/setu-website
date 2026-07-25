import { Outlet, Routes, Route } from "react-router-dom"
import MarketingPage from "./pages/MarketingPage"
import LoginPage from "./pages/LoginPage"
import RegisterProfilePage from "./pages/RegisterProfilePage"
import RegisterCompletePage from "./pages/RegisterCompletePage"
import VleDashboardPage from "./pages/vle/VleDashboardPage"
import VleRegisterUserPage from "./pages/vle/VleRegisterUserPage"
import VleWalletPage from "./pages/vle/VleWalletPage"
import VleLeaderboardPage from "./pages/vle/VleLeaderboardPage"
import VleCustomersPage from "./pages/vle/VleCustomersPage"
import VleRewardsPage from "./pages/vle/VleRewardsPage"
import VleMarketingPage from "./pages/vle/VleMarketingPage"
import VleSupportPage from "./pages/vle/VleSupportPage"
import VleLayout from "./layouts/VleLayout"
import CoordinatorDashboardPage from "./pages/coordinator/CoordinatorDashboardPage"
import RoleProtectedRoute from "./components/RoleProtectedRoute"
import AppLayout from "./layouts/AppLayout"
import AppDashboard from "./pages/AppDashboard"
import ModulePage from "./pages/ModulePage"
import SosHome from "./pages/sos/SosHome"
import SosContacts from "./pages/sos/SosContacts"
import SosProfile from "./pages/sos/SosProfile"
import ReportsHome from "./pages/reports/ReportsHome"
import ReportsCategoryPage from "./pages/reports/ReportsCategoryPage"
import ReportsDetailPage from "./pages/reports/ReportsDetailPage"
import ProtectedRoute from "./components/ProtectedRoute"
import TelemedicineHome from "./pages/telemedicine/TelemedicineHome"
import DoctorsList from "./pages/telemedicine/DoctorsList"
import DoctorDetail from "./pages/telemedicine/DoctorDetail"
import BookReview from "./pages/telemedicine/BookReview"
import BookingConfirmation from "./pages/telemedicine/BookingConfirmation"
import MyAppointments from "./pages/telemedicine/MyAppointments"
import BookTestHome from "./pages/booktest/BookTestHome"
import {
  BookTestPackageDetail,
  BookTestPackages,
} from "./pages/booktest/BookTestPackages"
import BookTestCart from "./pages/booktest/BookTestCart"
import BookTestPatient from "./pages/booktest/BookTestPatient"
import BookTestSlots from "./pages/booktest/BookTestSlots"
import BookTestCheckout from "./pages/booktest/BookTestCheckout"
import {
  BookTestOrderDetail,
  BookTestOrders,
} from "./pages/booktest/BookTestOrders"
import {
  BookTestFailure,
  BookTestSuccess,
} from "./pages/booktest/BookTestResult"
import BookTestSaved from "./pages/booktest/BookTestSaved"
import { BookTestProvider } from "./context/BookTestContext"
import GenericHome from "./pages/generic/GenericHome"
import {
  GenericCategory,
  GenericProductDetail,
} from "./pages/generic/GenericProducts"
import GenericCart from "./pages/generic/GenericCart"
import GenericCompare from "./pages/generic/GenericCompare"
import GenericPrescription from "./pages/generic/GenericPrescription"
import {
  GenericOrderDetail,
  GenericOrders,
} from "./pages/generic/GenericOrders"
import GenericRequests from "./pages/generic/GenericRequests"
import {
  GenericFailure,
  GenericSuccess,
} from "./pages/generic/GenericResult"
import { GenericMedicineProvider } from "./context/GenericMedicineContext"
import { MentalHealthProvider } from "./context/MentalHealthContext"
import MentalSubject from "./pages/mental/MentalSubject"
import MentalAssessments from "./pages/mental/MentalAssessments"
import MentalRunner from "./pages/mental/MentalRunner"
import MentalResults from "./pages/mental/MentalResults"
import MentalHistory from "./pages/mental/MentalHistory"
import MentalBookings from "./pages/mental/MentalBookings"
import MentalDevice from "./pages/mental/MentalDevice"
import MentalDeviceDetails from "./pages/mental/MentalDeviceDetails"
import MentalDeviceAddress from "./pages/mental/MentalDeviceAddress"
import MentalDeviceReview from "./pages/mental/MentalDeviceReview"
import MentalDeviceSuccess from "./pages/mental/MentalDeviceSuccess"
import MentalSolh from "./pages/mental/MentalSolh"
import MentalFaceScan from "./pages/mental/MentalFaceScan"
import SchemesHome from "./pages/schemes/SchemesHome"
import SchemesCategories from "./pages/schemes/SchemesCategories"
import SchemesList from "./pages/schemes/SchemesList"
import SchemesStates from "./pages/schemes/SchemesStates"
import SchemesStateEnrolled from "./pages/schemes/SchemesStateEnrolled"
import SchemeOverview from "./pages/schemes/SchemeOverview"
import SchemesInterests from "./pages/schemes/SchemesInterests"
import FindWizard from "./pages/schemes/FindWizard"
import FindResults from "./pages/schemes/FindResults"
import FindProfiles from "./pages/schemes/FindProfiles"
import DrugHub from "./pages/drug/DrugHub"
import DrugBrowse from "./pages/drug/DrugBrowse"
import DrugDetail from "./pages/drug/DrugDetail"
import AyurvedaHome from "./pages/drug/AyurvedaHome"
import AyurvedaDetail from "./pages/drug/AyurvedaDetail"
import DrugReminders from "./pages/drug/DrugReminders"
import AgriHub from "./pages/agriculture/AgriHub"
import AgriProducts from "./pages/agriculture/AgriProducts"
import AgriProductDetail from "./pages/agriculture/AgriProductDetail"
import AgriCart from "./pages/agriculture/AgriCart"
import AgriCheckout from "./pages/agriculture/AgriCheckout"
import AgriOrders from "./pages/agriculture/AgriOrders"
import AgriKnowledge from "./pages/agriculture/AgriKnowledge"
import AgriKnowledgeDetail from "./pages/agriculture/AgriKnowledgeDetail"
import AgriSoilBook from "./pages/agriculture/AgriSoilBook"
import AgriSoilBookings from "./pages/agriculture/AgriSoilBookings"
import AgriInquiry from "./pages/agriculture/AgriInquiry"
import AgriInquiryHistory from "./pages/agriculture/AgriInquiryHistory"
import AgriDisease from "./pages/agriculture/AgriDisease"
import AbhaHub from "./pages/abha/AbhaHub"
import AbhaLoginOptions from "./pages/abha/AbhaLoginOptions"
import AbhaLoginForm from "./pages/abha/AbhaLoginForm"
import AbhaLoginOtp from "./pages/abha/AbhaLoginOtp"
import AbhaSelectAddress from "./pages/abha/AbhaSelectAddress"
import AbhaCreateHub from "./pages/abha/AbhaCreateHub"
import AbhaCreateAadhaar from "./pages/abha/AbhaCreateAadhaar"
import AbhaCreateAadhaarOtp from "./pages/abha/AbhaCreateAadhaarOtp"
import AbhaCreateAddress from "./pages/abha/AbhaCreateAddress"
import AbhaCreatePhr from "./pages/abha/AbhaCreatePhr"
import AbhaCreateOtp from "./pages/abha/AbhaCreateOtp"
import AbhaProfile from "./pages/abha/AbhaProfile"
import AbhaPhrCard, { AbhaQrShare } from "./pages/abha/AbhaPhrCard"
import AbhaConsents, {
  AbhaConsentDetail,
  AbhaNotifications,
} from "./pages/abha/AbhaConsents"
import AbhaFacilities, { AbhaLinkFacility } from "./pages/abha/AbhaFacilities"
import FitnessOnboarding from "./pages/fitness/FitnessOnboarding"
import FitnessHome from "./pages/fitness/FitnessHome"
import FitnessWorkout, {
  FitnessDailyWorkout,
  FitnessExerciseDetail,
} from "./pages/fitness/FitnessWorkout"
import FitnessFood, {
  FitnessAddFood,
  FitnessFavoriteMeals,
  FitnessMeals,
  FitnessWater,
} from "./pages/fitness/FitnessFood"
import FitnessRecipes, {
  FitnessPlans,
  FitnessRecipeDetail,
  FitnessSavedRecipes,
  FitnessSwaps,
} from "./pages/fitness/FitnessRecipes"
import FitnessDietitians, {
  FitnessConsultations,
  FitnessDietitianDetail,
  FitnessDietPlans,
  FitnessRequestDietPlan,
} from "./pages/fitness/FitnessDietitians"
import FitnessProfile, {
  FitnessFaqs,
  FitnessProfileEdit,
} from "./pages/fitness/FitnessProfile"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<LoginPage />} />
      <Route path="/register/profile" element={<RegisterProfilePage />} />
      <Route path="/register/complete" element={<RegisterCompletePage />} />

      <Route
        path="/vle"
        element={
          <RoleProtectedRoute allow="vle">
            <VleLayout />
          </RoleProtectedRoute>
        }
      >
        <Route path="dashboard" element={<VleDashboardPage />} />
        <Route path="wallet" element={<VleWalletPage />} />
        <Route path="register-user" element={<VleRegisterUserPage />} />
        <Route path="customers" element={<VleCustomersPage />} />
        <Route path="rewards" element={<VleRewardsPage />} />
        <Route path="marketing" element={<VleMarketingPage />} />
        <Route path="support" element={<VleSupportPage />} />
        <Route path="leaderboard" element={<VleLeaderboardPage />} />
      </Route>
      <Route
        path="/coordinator/dashboard"
        element={
          <RoleProtectedRoute allow="district_coordinator">
            <CoordinatorDashboardPage />
          </RoleProtectedRoute>
        }
      />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AppDashboard />} />
        <Route path="sos" element={<SosHome />} />
        <Route path="sos/contacts" element={<SosContacts />} />
        <Route path="sos/profile" element={<SosProfile />} />
        <Route path="reports" element={<ReportsHome />} />
        <Route path="reports/:category" element={<ReportsCategoryPage />} />
        <Route path="reports/:category/:id" element={<ReportsDetailPage />} />

        {/* Telemedicine stack — must be before :moduleId catch-all */}
        <Route path="telemedicine" element={<TelemedicineHome />} />
        <Route path="telemedicine/home" element={<TelemedicineHome />} />
        <Route path="telemedicine/doctors" element={<DoctorsList />} />
        <Route path="telemedicine/doctors/:id" element={<DoctorDetail />} />
        <Route path="telemedicine/book/:id" element={<BookReview />} />
        <Route path="telemedicine/confirmation" element={<BookingConfirmation />} />
        <Route path="telemedicine/appointments" element={<MyAppointments />} />
        <Route path="doctors" element={<TelemedicineHome />} />

        {/* Book Test stack — must be before :moduleId catch-all */}
        <Route
          path="book-tests"
          element={
            <BookTestProvider>
              <Outlet />
            </BookTestProvider>
          }
        >
          <Route index element={<BookTestHome />} />
          <Route path="home" element={<BookTestHome />} />
          <Route path="packages" element={<BookTestPackages />} />
          <Route path="packages/:code" element={<BookTestPackageDetail />} />
          <Route path="cart" element={<BookTestCart />} />
          <Route path="patient" element={<BookTestPatient />} />
          <Route path="slots" element={<BookTestSlots />} />
          <Route path="checkout" element={<BookTestCheckout />} />
          <Route path="orders" element={<BookTestOrders />} />
          <Route path="orders/:orderId" element={<BookTestOrderDetail />} />
          <Route path="saved" element={<BookTestSaved />} />
          <Route path="success" element={<BookTestSuccess />} />
          <Route path="failure" element={<BookTestFailure />} />
        </Route>

        {/* Generic Medicine stack — must be before :moduleId catch-all */}
        <Route
          path="generic-medicine"
          element={
            <GenericMedicineProvider>
              <Outlet />
            </GenericMedicineProvider>
          }
        >
          <Route index element={<GenericHome />} />
          <Route path="home" element={<GenericHome />} />
          <Route path="category/:categoryId" element={<GenericCategory />} />
          <Route path="products/:productId" element={<GenericProductDetail />} />
          <Route path="cart" element={<GenericCart />} />
          <Route path="compare" element={<GenericCompare />} />
          <Route path="prescription" element={<GenericPrescription />} />
          <Route path="orders" element={<GenericOrders />} />
          <Route path="orders/:orderId" element={<GenericOrderDetail />} />
          <Route path="requests" element={<GenericRequests />} />
          <Route path="success" element={<GenericSuccess />} />
          <Route path="failure" element={<GenericFailure />} />
        </Route>

        {/* Mental Health stack — must be before :moduleId catch-all */}
        <Route
          path="mental-health"
          element={
            <MentalHealthProvider>
              <Outlet />
            </MentalHealthProvider>
          }
        >
          <Route index element={<MentalSubject />} />
          <Route path="subject" element={<MentalSubject />} />
          <Route path="assessments" element={<MentalAssessments />} />
          <Route path="runner/:id" element={<MentalRunner />} />
          <Route path="results" element={<MentalResults />} />
          <Route path="history" element={<MentalHistory />} />
          <Route path="bookings" element={<MentalBookings />} />
          <Route path="device" element={<MentalDevice />} />
          <Route path="device/details" element={<MentalDeviceDetails />} />
          <Route path="device/address" element={<MentalDeviceAddress />} />
          <Route path="device/review" element={<MentalDeviceReview />} />
          <Route path="device/success" element={<MentalDeviceSuccess />} />
          <Route path="solh" element={<MentalSolh />} />
          <Route path="solh/test/:testId" element={<MentalSolh />} />
          <Route path="solh/:categoryId" element={<MentalSolh />} />
          <Route path="face-scan" element={<MentalFaceScan />} />
        </Route>

        {/* Government Schemes stack — must be before :moduleId catch-all */}
        <Route path="govt-schemes" element={<SchemesHome />} />
        <Route path="govt-schemes/central" element={<SchemesCategories />} />
        <Route path="govt-schemes/central/:categoryName" element={<SchemesList />} />
        <Route path="govt-schemes/states" element={<SchemesStates />} />
        <Route path="govt-schemes/states/:stateCode" element={<SchemesStateEnrolled />} />
        <Route path="govt-schemes/scheme/:slug" element={<SchemeOverview />} />
        <Route path="govt-schemes/interests" element={<SchemesInterests />} />
        <Route path="govt-schemes/find" element={<FindWizard />} />
        <Route path="govt-schemes/find/results" element={<FindResults />} />
        <Route path="govt-schemes/find/profiles" element={<FindProfiles />} />

        {/* Drug Directory stack — must be before :moduleId catch-all */}
        <Route path="drug-directory" element={<DrugHub />} />
        <Route path="drug-directory/drugs" element={<DrugBrowse />} />
        <Route path="drug-directory/drugs/:idOrSlug" element={<DrugDetail />} />
        <Route path="drug-directory/ayurveda" element={<AyurvedaHome />} />
        <Route
          path="drug-directory/ayurveda/:idOrSlug"
          element={<AyurvedaDetail />}
        />
        <Route path="drug-directory/reminders" element={<DrugReminders />} />

        {/* Agriculture / Agri Connect — must be before :moduleId catch-all */}
        <Route path="agriculture" element={<AgriHub />} />
        <Route path="agriculture/products" element={<AgriProducts />} />
        <Route path="agriculture/products/:id" element={<AgriProductDetail />} />
        <Route path="agriculture/cart" element={<AgriCart />} />
        <Route path="agriculture/checkout" element={<AgriCheckout />} />
        <Route path="agriculture/orders" element={<AgriOrders />} />
        <Route path="agriculture/knowledge" element={<AgriKnowledge />} />
        <Route
          path="agriculture/knowledge/:id"
          element={<AgriKnowledgeDetail />}
        />
        <Route path="agriculture/soil" element={<AgriSoilBook />} />
        <Route path="agriculture/soil/bookings" element={<AgriSoilBookings />} />
        <Route path="agriculture/inquiry" element={<AgriInquiry />} />
        <Route
          path="agriculture/inquiry/history"
          element={<AgriInquiryHistory />}
        />
        <Route path="agriculture/disease" element={<AgriDisease />} />

        {/* ABHA / ABDM stack — must be before :moduleId catch-all */}
        <Route path="abha" element={<AbhaHub />} />
        <Route path="abha/login" element={<AbhaLoginOptions />} />
        <Route path="abha/login/otp" element={<AbhaLoginOtp />} />
        <Route path="abha/login/select-address" element={<AbhaSelectAddress />} />
        <Route path="abha/login/:method" element={<AbhaLoginForm />} />
        <Route path="abha/create" element={<AbhaCreateHub />} />
        <Route path="abha/create/aadhaar" element={<AbhaCreateAadhaar />} />
        <Route path="abha/create/aadhaar/otp" element={<AbhaCreateAadhaarOtp />} />
        <Route
          path="abha/create/aadhaar/address"
          element={<AbhaCreateAddress />}
        />
        <Route path="abha/create/abha-number" element={<AbhaCreatePhr />} />
        <Route path="abha/create/mobile" element={<AbhaCreatePhr />} />
        <Route path="abha/create/otp" element={<AbhaCreateOtp />} />
        <Route path="abha/profile" element={<AbhaProfile />} />
        <Route path="abha/phr-card" element={<AbhaPhrCard />} />
        <Route path="abha/qr" element={<AbhaQrShare />} />
        <Route path="abha/consents" element={<AbhaConsents />} />
        <Route path="abha/consents/:id" element={<AbhaConsentDetail />} />
        <Route path="abha/notifications" element={<AbhaNotifications />} />
        <Route path="abha/facilities" element={<AbhaFacilities />} />
        <Route path="abha/facilities/link" element={<AbhaLinkFacility />} />

        {/* Fitness stack — must be before :moduleId catch-all */}
        <Route path="fitness" element={<FitnessHome />} />
        <Route path="fitness/home" element={<FitnessHome />} />
        <Route path="fitness/onboarding" element={<FitnessOnboarding />} />
        <Route path="fitness/workout" element={<FitnessWorkout />} />
        <Route path="fitness/workout/daily" element={<FitnessDailyWorkout />} />
        <Route
          path="fitness/workout/:exerciseId"
          element={<FitnessExerciseDetail />}
        />
        <Route path="fitness/food" element={<FitnessFood />} />
        <Route path="fitness/food/water" element={<FitnessWater />} />
        <Route path="fitness/food/add" element={<FitnessAddFood />} />
        <Route path="fitness/food/meals" element={<FitnessMeals />} />
        <Route path="fitness/food/favorites" element={<FitnessFavoriteMeals />} />
        <Route path="fitness/recipes" element={<FitnessRecipes />} />
        <Route path="fitness/recipes/saved" element={<FitnessSavedRecipes />} />
        <Route
          path="fitness/recipes/:recipeId"
          element={<FitnessRecipeDetail />}
        />
        <Route path="fitness/swaps" element={<FitnessSwaps />} />
        <Route path="fitness/plans" element={<FitnessPlans />} />
        <Route path="fitness/dietitians" element={<FitnessDietitians />} />
        <Route
          path="fitness/dietitians/:dietitianId"
          element={<FitnessDietitianDetail />}
        />
        <Route path="fitness/consultations" element={<FitnessConsultations />} />
        <Route path="fitness/diet-plans" element={<FitnessDietPlans />} />
        <Route
          path="fitness/diet-plans/request"
          element={<FitnessRequestDietPlan />}
        />
        <Route path="fitness/profile" element={<FitnessProfile />} />
        <Route path="fitness/profile/edit" element={<FitnessProfileEdit />} />
        <Route path="fitness/faqs" element={<FitnessFaqs />} />

        <Route path=":moduleId" element={<ModulePage />} />
      </Route>
    </Routes>
  )
}
