import { Arg, Args, Ctx, FieldResolver, Query, Resolver, Root } from "type-graphql"
import { FiltersOffer, Offer } from "../Entity/Offer"
import { Objkt } from "../Entity/Objkt"
import { User } from "../Entity/User"
import { RequestContext } from "../types/RequestContext"
import { PaginationArgs, useDefaultValues } from "./Arguments/Pagination"
import { In } from "typeorm"
import { OffersSortInput } from "./Arguments/Sort"
import { processFilters, processOfferFilters } from "../Utils/Filters"
import { searchIndexMarketplace } from "../Services/Search"

@Resolver(Offer)
export class OfferResolver {
  @FieldResolver(returns => User, { nullable: true })
	issuer(
		@Root() offer: Offer,
		@Ctx() ctx: RequestContext
	) {
		if (offer.issuer) return offer.issuer
		return ctx.offerIssuersLoader.load(offer.id)
	}

  @FieldResolver(returns => Objkt, { nullable: true })
	objkt(
		@Root() offer: Offer,
		@Ctx() ctx: RequestContext
	) {
		if (offer.objkt) return offer.objkt
		return ctx.offerObjktsLoader.load(offer.id)
	}
  
  @Query(returns => [Offer])
	async offers(
		@Args() { skip, take }: PaginationArgs,
		@Arg("sort", { nullable: true }) sortArgs: OffersSortInput,
		@Arg("filters", FiltersOffer, { nullable: true }) filters: any
	): Promise<Offer[]> {
		// default sort argument
		if (!sortArgs || Object.keys(sortArgs).length === 0) {
			sortArgs = {
				createdAt: "DESC"
			}
		}

		// default [skip, take} arguments
		;[skip, take] = useDefaultValues([skip, take], [0, 20])

		// start building the query
		let query = Offer.createQueryBuilder("offer").select()

		// if their is a search string, we first make a request to the search engine to get results
		if (filters?.searchQuery_eq) {
			const searchResults = await searchIndexMarketplace.search(filters.searchQuery_eq, { 
				hitsPerPage: 5000
			})
			const ids = searchResults.hits.map(hit => hit.objectID)
			query = query.whereInIds(ids)
			// if the sort option is relevance, we remove the sort arguments as the order
			// of the search results needs to be preserved
			if (sortArgs && sortArgs.relevance) {
				delete sortArgs.relevance
				// then we manually set the order using array_position
				const relevanceList = ids.map((id, idx) => `$${idx+1}`).join(', ')
				query = query.addOrderBy(`array_position(array[${relevanceList}], offer.id)`)
			}
		}

		// add the sort arguments
		for (const field in sortArgs) {
			query = query.addOrderBy(`offer.${field}`, sortArgs[field])
		}

		// custom filters
		if (filters?.fullyMinted_eq != null || filters?.authorVerified_eq != null
			|| filters?.tokenSupply_lte != null || filters?.tokenSupply_gte != null) {
			// in all cases, we want to join with these 2 tables
			query = query.leftJoin("offer.objkt", "objkt")
			query = query.leftJoin("objkt.issuer", "token")
			// if there is a filter on fully minted issuer
			if (filters?.fullyMinted_eq != null) {
				if (filters.fullyMinted_eq === true) {
					query = query.andWhere("token.balance = 0")
				}
				else {
					query = query.andWhere("token.balance > 0")
				}
			}
			
			// filter for author of the offer verified
			if (filters?.authorVerified_eq != null) {
				query = query.leftJoin("token.author", "author")
				if (filters.authorVerified_eq === true) {
					query = query.andWhere("author.flag = 'VERIFIED'")
				}
				else {
					query = query.andWhere("author.flag != 'VERIFIED'")
				}
			}

			// if we filter the size of the editions
			if (filters?.tokenSupply_lte != null) {
				query = query.andWhere("token.supply <= :sizeLte", { sizeLte: filters.tokenSupply_lte })
			}
			if (filters?.tokenSupply_gte != null) {
				query = query.andWhere("token.supply >= :sizeGte", { sizeGte: filters.tokenSupply_gte })
			}
		}

		// add the where clauses
		const processedFilters = processOfferFilters(filters)
		for (const filter of processedFilters) {
			query = query.andWhere(filter)
		}

		// add the pagination
		query = query.skip(skip)
		query = query.take(take)

		// finally the cache
		// query = query.cache(5000)

		const results = await query.getMany()

		return results
	}
	
  @Query(returns => [Offer], { nullable: true })
	async offersByIds(
		@Arg("ids", type => [Number]) ids: number[],
		@Arg("sort", { nullable: true }) sortArgs: OffersSortInput,
	): Promise<Offer[]> {
		const offers = await Offer.find({
			where: {
				id: In(ids)
			},
			order: sortArgs,
			take: 100
		})

		return offers
	}
}