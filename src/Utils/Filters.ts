import { FilterOperator } from "type-graphql-filter"
import { FindConditions, FindOperator, Not, LessThan, MoreThan, Equal, In, MoreThanOrEqual, LessThanOrEqual } from "typeorm"
import { Offer } from "../Entity/Offer"

function mapFilterOperatorTypeorm(operator: FilterOperator) {
  switch (operator) {
    case "eq": return Equal
    case "ne": return Not
    case "gt": return MoreThan
    case "gte": return MoreThanOrEqual
    case "lt": return LessThan
    case "lte": return LessThanOrEqual
    case "in": return In
    default: return Equal
  }
}

export const processFilters = (filters: any) => {
  if (!filters) return {}

  let typeormFilters: Record<string, any> = {}

  for (const [filterKey, value] of Object.entries(filters)) {
    const [field, operator] = filterKey.split("_")
    typeormFilters[field] = mapFilterOperatorTypeorm(operator as FilterOperator)(value as any)
  }

  return typeormFilters
}


/**
 * Generic purpose method to process filters for an endpoint, only allowing a list of
 * filters to go through the endpoint
 */
export const processSelectiveFilters = (filters: Record<string, any>, allowed: string[] = []) => {
  if (!filters) return []

  let typeormFilters: Record<string, any>[] = []

  for (const [filterKey, value] of Object.entries(filters)) {
    const [field, operator] = filterKey.split("_")
    // if the field is in the db fields allowed, add it
    if (allowed.includes(field)) {
      typeormFilters.push({
        [field]: mapFilterOperatorTypeorm(operator as FilterOperator)(value as any)
      })
    }
  }

  return typeormFilters
}


const offerFiltersDbFields = [ "price" ]

/**
 * This method processes the offer filters which can be run against the DB fields.
 * If a filter doesn't target a DB field, it will be ignored by this method
 */
export const processOfferFilters = (filters: any) => {
  return processSelectiveFilters(filters, offerFiltersDbFields)
}


const generativeFiltersDbFields = [ "price", "supply" ]

/**
 * This method processes the offer filters which can be run against the DB fields.
 * If a filter doesn't target a DB field, it will be ignored by this method
 */
export const processGenerativeFilters = (filters: any) => {
  return processSelectiveFilters(filters, generativeFiltersDbFields)
}


const userCollectionFiltersDbFields = [ "assigned", "createdAt", "assignedAt" ] 

/**
 * This method processes the offer filters which can be run against the DB fields.
 * If a filter doesn't target a DB field, it will be ignored by this method
 */
export const processUserCollectionFilters = (filters: any) => {
  return processSelectiveFilters(filters, userCollectionFiltersDbFields)
}
