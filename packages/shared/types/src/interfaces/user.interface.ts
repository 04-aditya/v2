import { IUserPAT } from './userpat.interface';
import { IUserRole } from './userrole.interface';

export interface IUser {
  id: number;
  email: string;
  eid?: string;

  // employment_type: string,
  // termination_date: Date,
  // most_recent_hire_date: Date,
  // last_promotion_date: Date,
  // probationary_period_end_date: Date,

  /*
   {
        "staffing_partner_first_name": "Vartika",
        "staffing_partner_last_name": "Jain",

        "current_office": "Bagmane Constellation Business Park",
        "work_city": "Bengaluru",
        "work_state": "Karnataka",
        "country": "India",


        "supervisor_id": "7000109",
        "supervisor_llid": "tildodda",
        "supervisor_name": "Doddapaneni, Tilak",
        "supervisor_email": "tilak.doddapaneni@publicissapient.com",
        "supervisor_location_code": "IN-BLR-CON",


        "industry_focus": "None",
        "industry_aligned": "False",

        "discipline": "Missing",
        "craft": "Missing",
        "primary_capability": "SDE",
        "hrms_1": "Delivery",
        "hrms_2": "Engineering",
        "hrms_3": "Engineering Leadership",

        "is_home_worker": "No",
        "bonus_eligible_yn": "Yes",
        "standard_weekly_hours": "40",
        "legal_entity": "TLG India Pvt Ltd - LEG",
        "employee_status": "Active",
        "job_code": "EN_SE_I_SWE",
        "altair_product": "Not Applicable",
        "brand": "GDD",
        "adjusted_service_date": "8/1/2018",
        "snapshot_date": "9/28/2022",
        "llid": "rakravur",
        "career_level": "I",
        "compensation_manager": "Doddapaneni, Tilak",
        "brand_id": "BR031",
        "hr_manager_llid": "smrjoon1",
        "market": "Publicis Sapient",
        "original_start_date": "6/19/2006",
        "cost_center": "SNINDIA-Shared Cap Delivery",
        "pay_group_id": "IN-B_12",
        "employee_class": "Employee",
        "regular_temporary": "Regular",
        "notice_period": "90",
        "cost_center_code": "ORA-2231",
        "bu_name": "PS IN Shared Capabilities",
        "child_job_function": "Software Engineering",
        "staffing_partner_csid": "7107543.0",
        "probation_status": "Missing",
        "pay_frequency": "Monthly",
        "notice_period_unit": "Days",
        "global_concurrent_emp_indicator": "Missing",
        "acquisition_date": "1/1/1970",
        "contract_end_date": "1/1/1970",
        "hr_manager": "Joon, Smriti",
        "seniority_start_date": "8/1/2018",
        "bu": "BU1309",
        "brand_affiliation": "Publicis Sapient",
        "global_grade": "150",
        "legal_entity_code": "INL1052",
        "job_classification_label": "Engineering Software Engineering I Software Engineering",
        "total_experience_in_publicis": "4 Years,  1 Months",
        "fte": "1",
        "legacy_system_name": "Oracle",
        "department": "Missing",
        "officer_code_label": "Missing",
        "legacy_system_id": "36990",
        "hfm_code": "IN4288",
        "time_and_expense_approver_llid": "Missing",
        "department_id": "397",
        "payroll_id": "118292",
        "altair_activity_type": "Not Applicable",
        "country_of_legal_entity": "India",
        "capacity_type": "Delivery",
        "m_opdr_count_csid": "1",
        "supervisor_country": "India",
        "is_contingent_worker": "No",
        "solution_hub": "Publicis Sapient",
        "parent_job_function": "Engineering",
        "personal_email": "rravuri@gmail.com"
        "personal_mobile": "9900288119",


        "user_id": "7036990", //eid
        "career_settings_id": "7036990", //eid
        "email_address": "rakesh.ravuri@publicissapient.com", // email

        "business_title": "SVP Engineering",

        "first_name": "Rakesh",
        "preferred_first_name": "Rakesh",
        "middle_name": "Missing",
        "last_name": "Ravuri",
        "preferred_last_name": "Ravuri",

        "employment_type": "Fulltime",
        "termination_date": "1/1/1970",
        "most_recent_hire_date": "8/1/2018",
        "last_promotion_date": "1/1/1970",
        "probationary_period_end_date": "1/1/1970",

    },
  */

  roles: IUserRole[];

  pats?: IUserPAT[];
}
