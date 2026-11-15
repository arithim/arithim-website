"""Text for the live energy pages built by tools/build_live.py.

Every page has its own question-style title, description, lede and a short Q&A. Each answer only restates
what the dashboard's own chart notes and source descriptions say, so nothing here is a claim the data does not make.
The dashboards' markup and numbers come from the dashboard pages; this file is only the words around them.

Keys per technology:
  slug       file stem, so the overview is live-<slug>.html and a region is live-<slug>-<region>.html
  src        the dashboard page file in the source folder
  bundle     name of the script bundle written to assets/live/ (every script after the shared helper)
  nav        short name used in the breadcrumb and the switcher
  hero       id of the one intro card kept on the overview
  relocate   (card id, region id): an intro card that moves to a region page so no chart is lost
  regions    in display order: id (the source tab id), slug, title, description, lede, blurb, faq
"""

LIVE_NOTE = "Some grids that appear on our private dashboards are held back here until their operators allow display on a commercial website."

LANDING = {
    "file": "live.html",
    "title": "Where can I see live solar, wind and battery data for Great Britain?",
    "description": "Live solar, wind, battery and renewable data from Arithim: Great Britain in full and other grids as their operators allow, refreshed every hour from open data.",
    "lede": "Built on open data and refreshed every hour. Great Britain is covered in full, and other grids appear as their operators allow their data on a commercial site. Start with the renewables total, or open one technology and drill down to a region.",
    "faq": [
        ("How often is the live data refreshed?", "Every hour. Each grid publishes on its own schedule, so the latest reading for one may be a few minutes old and for another an hour or two."),
        ("Which grids are covered?", "Great Britain in full, plus the other grids whose operators allow their data on a commercial site. Each dashboard has a page for Great Britain, Europe, the Americas, Asia-Pacific and the world, and each page lists its sources at the bottom."),
        ("Where does the data come from?", "From grid operators and open data services such as Elexon, NESO, Sheffield Solar, the US EIA and Ember. A job fetches the latest figures every hour and keeps only the sources whose licences allow display on a commercial site."),
    ],
}

TECHS = [
    {
        "slug": "solar", "src": "index.html", "bundle": "solar", "nav": "Solar",
        "hero": "live-now", "relocate": ("live-map-card", "world"),
        "card": "Solar output by grid and region, with forecasts for Great Britain.",
        "overview": {
            "title": "How much solar power is the world generating right now?",
            "description": "Live solar output for every grid that publishes it, with a page for Great Britain, Europe, the Americas, Asia-Pacific and yearly figures for every country.",
            "lede": "The headline figures for solar output right now, and one page for each part of the world.",
            "faq": [
                ("How up to date is this page?", "The data is fetched every hour. Each grid publishes on its own schedule, so the latest reading for one may be a few minutes old and for another an hour or two."),
                ("Which grids are included?", "Great Britain in full, and the other grids whose operators allow their data on a commercial site. The region pages show what is available for each part of the world."),
                ("What does the total add up?", "Each live grid's latest reading, added together. It is a count of what these grids report, not a measure of all the solar in the world."),
            ],
        },
        "regions": [
            {"id": "uk", "slug": "uk",
             "title": "How much solar power is Great Britain generating right now?",
             "description": "Live solar generation for Great Britain by region, with a two-week forecast, a sixty-day heat map and a check of real output against modelled yield.",
             "lede": "Half-hourly solar output for Great Britain and its 14 network regions, NESO's forecast for the next two weeks, and how real output compares with modelled yield.",
             "blurb": "Great Britain by region, with a two-week forecast and a check of real output against modelled yield.",
             "faq": [
                 ("Where do the Great Britain figures come from?", "Sheffield Solar's PV_Live service estimates all of Great Britain's solar output every half hour, scaling up readings from a sample of metered systems. The forecast is NESO's embedded solar forecast. Both are published under open licences."),
                 ("Why is output so far below installed capacity?", "Panels reach their rated output only in bright, cool sunshine with the sun high and square on. Cloud, season, time of day and the angle each array faces all pull it down, which is why the regional map shows capacity factor: the share of what the panels could make running flat out."),
                 ("What does the regional map show?", "Capacity factor for each of the 14 network licence areas: the energy generated as a share of what the installed capacity could make running flat out."),
             ]},
            {"id": "europe", "slug": "europe",
             "title": "How much solar power is Europe generating right now?",
             "description": "Live solar output for the European countries whose grids publish it: the last 48 hours, generation by country and each country's latest reading.",
             "lede": "Solar output by country over the last 48 hours, the energy generated in the last 24 hours, and a table with each country's latest reading and capacity factor.",
             "blurb": "Output by country over the last two days.",
             "faq": [
                 ("Why does a country show a dash under Now?", "A dash means the feed is more than six hours behind. Feeds run from 15 minutes to a few hours behind real time."),
                 ("What does CF mean in the table?", "Capacity factor: the energy generated as a share of what the installed capacity could make running flat out. It uses Ember's year-end capacity."),
             ]},
            {"id": "americas", "slug": "americas",
             "title": "How much solar power are the Americas generating right now?",
             "description": "Live solar output for grids in the United States, Canada and Brazil, from California and New England to US grid operators.",
             "lede": "Solar output for California, New England, Canada and Brazil, and for US grid operators, over the last two days.",
             "blurb": "California, New England, Canada, Brazil and US grid operators.",
             "faq": [
                 ("Does this include rooftop solar?", "Mostly not. California's figure leaves out solar behind the meter, Brazil's covers centralised plants only, and most New England solar is on rooftops and is not counted."),
                 ("How far behind is the US operator data?", "The US grid operator chart comes from the EIA-930 grid monitor, which runs about a day behind real time."),
             ]},
            {"id": "asia", "slug": "asia",
             "title": "How much solar power are Japan, Australia and South Korea generating right now?",
             "description": "Live solar output for Japan's transmission areas, Australia's main grid and South Korea, with rooftop and utility solar split out where the operator publishes it.",
             "lede": "Solar output for Japan by area, Australia's main grid by region and South Korea, from each operator's own feed.",
             "blurb": "Japan, Australia and South Korea.",
             "faq": [
                 ("How are rooftop and utility solar counted in Australia?", "Rooftop is AEMO's estimate. Utility is the dispatch target for large solar farms, so it reflects curtailment."),
                 ("Are all of Japan's areas included?", "Not yet. Hokkaido, Tohoku, Chubu and Okinawa are not in the feed."),
             ]},
            {"id": "world", "slug": "world",
             "title": "Which countries generate the most solar power?",
             "description": "Solar generation for every country from Ember's yearly data, the largest producers, world output since 2015 and where live feeds exist.",
             "lede": "Yearly solar generation for every country, the largest producers, world output since 2015, and the sun's path over the last two days across the live grids.",
             "blurb": "Yearly figures for every country, and the sun's path over two days.",
             "faq": [
                 ("Where do the yearly figures come from?", "From Ember's yearly electricity data. Each country shows the latest year Ember has for it."),
                 ("What does the world map show?", "Each country's latest full year of solar generation. Outlined countries have a live feed on this dashboard, and the shaded band is where it is night right now."),
             ]},
        ],
    },
    {
        "slug": "wind", "src": "wind.html", "bundle": "wind", "nav": "Wind",
        "hero": "wind-now", "relocate": ("wind-map-card", "world"),
        "card": "Wind output by grid and region, with Great Britain's onshore and offshore split.",
        "overview": {
            "title": "How much wind power is the world generating right now?",
            "description": "Live wind output for every grid that publishes it, with a page for Great Britain, Europe, the Americas, Asia-Pacific and yearly figures for every country.",
            "lede": "The headline figures for wind output right now, and one page for each part of the world.",
            "faq": [
                ("Where do the numbers come from?", "Elexon publishes half-hourly generation by fuel and actual generation by type for Great Britain, and NESO publishes the wind forecasts. Other grids come from their own system operators, and the yearly figures from Ember."),
                ("How often is it updated?", "Every hour. Elexon's onshore and offshore split runs about three hours behind; the other Great Britain figures are within the last half hour."),
                ("How is the live total worked out?", "It adds each grid's latest reading. Feeds more than six hours behind the newest are left out."),
            ],
        },
        "regions": [
            {"id": "gb", "slug": "gb",
             "title": "How much wind power is Great Britain generating right now?",
             "description": "Live wind generation for Great Britain, onshore and offshore, with NESO's 14-day forecast.",
             "lede": "Wind output metered on Great Britain's transmission network, split into onshore and offshore, with NESO's forecast for the next two weeks.",
             "blurb": "Onshore and offshore, with NESO's 14-day forecast.",
             "faq": [
                 ("Why can the live Great Britain figure look low?", "The live figure counts wind farms metered on the transmission network. Several gigawatts of smaller farms are connected to the local distribution networks, and they appear only in NESO's embedded wind forecast, which the chart shows separately."),
                 ("Why is the onshore and offshore split behind the other figures?", "It comes from Elexon's actual generation by type, which runs about three hours behind. The other Great Britain figures are within the last half hour."),
             ]},
            {"id": "europe", "slug": "europe",
             "title": "How much wind power is Europe generating right now?",
             "description": "Live wind output by European country over the last two days, with each country's latest reading, 24-hour peak and offshore share.",
             "lede": "Wind output by country over the last two days, with each country's latest reading, 24-hour peak and energy, and how much came from offshore farms where the source splits it.",
             "blurb": "Output by country, with offshore shares.",
             "faq": [
                 ("How often do the European feeds update?", "The chart shows hourly averages. Denmark and Ireland publish at their own 5 and 15 minute steps."),
                 ("What does the offshore column show?", "How much of a country's wind came from offshore farms, where the source splits it."),
             ]},
            {"id": "americas", "slug": "americas",
             "title": "How much wind power are the Americas generating right now?",
             "description": "Live wind output for grids in the United States, Canada and Brazil, plus US generation by grid operator.",
             "lede": "Wind output for the live grids in the Americas over the last two days, and for each US grid operator.",
             "blurb": "US, Canadian and Brazilian grids, and US operators.",
             "faq": [
                 ("How far behind is the US operator data?", "The US chart comes from the EIA-930 grid monitor and is about a day behind real time."),
                 ("How often do the live grids update?", "California and New England every 5 to 10 minutes, Brazil every minute, Ontario hourly, and Alberta one reading per hourly refresh."),
             ]},
            {"id": "asia", "slug": "asia",
             "title": "How much wind power are Australia, Japan and South Korea generating right now?",
             "description": "Live wind output for Australia's main grid by region, Japan by transmission area and South Korea.",
             "lede": "Wind output for Australia's main grid by region, for Japan's nine transmission areas and for South Korea.",
             "blurb": "Australia, Japan and South Korea.",
             "faq": [
                 ("Which wind is counted in Australia?", "Semi-scheduled wind cleared in dispatch each half hour, from AEMO."),
                 ("How often do these feeds update?", "Australia and Japan publish every half hour, and South Korea's KPX publishes every 5 minutes."),
             ]},
            {"id": "world", "slug": "world",
             "title": "Which countries generate the most wind power?",
             "description": "Wind generation for every country from Ember's yearly data, the largest producers, world output by year and where the wind is blowing now.",
             "lede": "Yearly wind generation for every country, the largest producers, world output by year, and a map of where the wind is blowing now.",
             "blurb": "Yearly figures for every country, and where the wind is blowing now.",
             "faq": [
                 ("Where do the yearly figures come from?", "From Ember's yearly electricity data. Each country shows the latest year Ember has for it."),
                 ("What does the yearly chart show?", "World wind generation in TWh for each year, with wind's share of world electricity above each bar."),
             ]},
        ],
    },
    {
        "slug": "batteries", "src": "battery.html", "bundle": "battery", "nav": "Batteries",
        "hero": "bat-now", "relocate": ("bat-clock-card", "gb"),
        "card": "Grid batteries charging and discharging, grid by grid.",
        "overview": {
            "title": "How much are grid batteries charging and discharging right now?",
            "description": "Live charging and discharging of grid batteries, grid by grid, with a page for Great Britain, Europe, the Americas and Asia-Pacific.",
            "lede": "What grid batteries are doing right now. Positive means discharging to the grid, negative means charging from it.",
            "faq": [
                ("Why do batteries charge in the middle of the day?", "Where there is a lot of solar, power is cheapest around midday. Batteries charge then and discharge into the evening peak, when solar fades and demand rises. California shows the pattern clearly."),
                ("Why do batteries take in more than they give back?", "Every charge and discharge loses some energy as heat, so over a day the energy charged runs a little above the energy discharged."),
                ("What do positive and negative mean?", "Positive means a battery is discharging to the grid. Negative means it is charging from it. This holds everywhere on these pages."),
            ],
        },
        "regions": [
            {"id": "gb", "slug": "gb",
             "title": "How much are grid batteries charging and discharging in Great Britain right now?",
             "description": "Live charging and discharging of grid batteries in Great Britain, with the highest discharge and the energy through them in the last 24 hours.",
             "lede": "What Great Britain's grid batteries are doing now and over the last two days, and what an average day looks like for them.",
             "blurb": "Great Britain over the last two days, and an average day on a clock.",
             "faq": [
                 ("How is the Great Britain figure worked out?", "No one publishes a live total for GB batteries. We add up the physical notifications of battery units in the Balancing Mechanism, the plan each unit sends to the system operator an hour ahead, from Elexon's data. It is an estimate: instructions after that hour change what actually happens, and smaller batteries outside the Balancing Mechanism are not counted."),
                 ("Are small batteries included?", "No. Batteries outside the Balancing Mechanism are not counted, so the figure is below the true total."),
             ]},
            {"id": "europe", "slug": "europe",
             "title": "Which European countries report what their grid batteries are doing?",
             "description": "Net battery output for the European countries that report it, hourly, with each grid's latest reading, highest discharge and energy in and out.",
             "lede": "Net battery output by country, hourly, from Energy-Charts, with a table of every grid that has battery data.",
             "blurb": "The few European countries that report batteries.",
             "faq": [
                 ("Why do so few countries appear?", "Most countries do not report batteries to ENTSO-E yet, so only a few have data."),
                 ("How is net output worked out?", "It is battery output minus battery consumption, as hourly averages from Energy-Charts."),
             ]},
            {"id": "americas", "slug": "americas",
             "title": "What are grid batteries doing in California and North America right now?",
             "description": "Live net battery output for California, New England and Alberta, from each operator's fuel mix.",
             "lede": "Net battery output for California over the last two days, and for New England and Alberta.",
             "blurb": "California, New England and Alberta.",
             "faq": [
                 ("Why does California's output dip below zero at midday?", "That is batteries soaking up solar. The evening peak is them selling it back."),
                 ("What does net mean here?", "The figure is each operator's net battery output from its fuel mix. Positive means discharging and negative means charging."),
             ]},
            {"id": "asia", "slug": "asia",
             "title": "What are grid batteries doing in Australia, Japan and South Korea right now?",
             "description": "Live net battery output for Australia's main grid by region, Japan by area and South Korea.",
             "lede": "Net battery output for Australia by region, for Japan by area and for South Korea.",
             "blurb": "Australia, Japan and South Korea.",
             "faq": [
                 ("How are the Australian figures worked out?", "As net output: battery generation minus battery load cleared in dispatch, from AEMO, every half hour."),
                 ("Where do the Japan and South Korea figures come from?", "Japan's come from the battery column of each area's supply and demand file, every half hour. South Korea's come from KPX's energy storage figures every 5 minutes."),
             ]},
        ],
    },
    {
        "slug": "renewables", "src": "renewables.html", "bundle": "renewables", "nav": "All renewables",
        "hero": "grid-now", "relocate": None,
        "card": "Renewables by source and their share of generation, hour by hour.",
        "overview": {
            "title": "How much renewable electricity is the world generating right now?",
            "description": "Live renewable output by source across the grids that publish it, with the renewable share where the whole mix is published, and yearly figures for every country.",
            "lede": "Solar, wind, hydro and bioenergy in the latest hour, and one page for each part of the world.",
            "faq": [
                ("What counts as renewable here?", "Solar, wind, hydro (not pumped storage), bioenergy and other renewables such as geothermal. Nuclear is not counted as renewable, and neither are imports."),
                ("Why do some grids show no renewable share?", "A share needs the whole generation mix. Great Britain publishes it; for several other grids only solar and wind are available live, so the page shows their output without a share."),
            ],
        },
        "regions": [
            {"id": "gb", "slug": "gb",
             "title": "What share of Great Britain's electricity is renewable right now?",
             "description": "Live renewable generation by source for Great Britain, and the renewable share hour by hour.",
             "lede": "Great Britain's generation by source over the last two days, and the share that was renewable each hour.",
             "blurb": "Generation by source and the renewable share, hour by hour.",
             "faq": [
                 ("Where do the Great Britain numbers come from?", "Solar is Sheffield Solar's PV_Live estimate; every other source is Elexon's half-hourly generation by fuel, which covers the transmission network."),
                 ("Why is the total a little under demand?", "Embedded wind and imports are not shown, so the generation on the chart adds up to a little less than demand."),
             ]},
            {"id": "europe", "slug": "europe",
             "title": "What share of Europe's electricity is renewable right now?",
             "description": "The renewable share of generation by European country in the latest hour, and Europe's generation over the last two days.",
             "lede": "The renewable share in each European country for which the whole mix is published, and their generation added together over the last two days.",
             "blurb": "Renewable share by country, and Europe's generation.",
             "faq": [
                 ("Which countries show a renewable share?", "The countries Energy-Charts publishes the whole generation mix for."),
                 ("What does the Europe chart add up?", "Hourly generation in GW for the countries with the whole mix, added together."),
             ]},
            {"id": "rest", "slug": "americas-asia-pacific",
             "title": "How much solar and wind power are the Americas and Asia-Pacific generating?",
             "description": "Hourly solar and wind output for the live grids in the Americas and Asia-Pacific added together.",
             "lede": "Solar and wind output outside Europe over the last two days, with the live grids in the Americas and Asia-Pacific added together.",
             "blurb": "Solar and wind outside Europe, added together.",
             "faq": [
                 ("Why is there no renewable share for these grids?", "A share needs the whole generation mix, and for these grids only solar and wind are published live."),
                 ("Why can the line start part way through the two days?", "Hours where more than one grid had not reported are left out, so the line can start later than the chart does."),
             ]},
            {"id": "world", "slug": "world",
             "title": "Which countries get the most electricity from renewables?",
             "description": "The renewable share of electricity for every country in its latest year, the largest renewable producers and world generation by source, from Ember.",
             "lede": "Each country's renewable share of electricity in its latest year, world renewable generation by year and source, and the largest renewable producers.",
             "blurb": "Yearly shares for every country, and world generation by source.",
             "faq": [
                 ("Where do the yearly figures come from?", "From Ember's yearly electricity data."),
                 ("What is in a country's renewable share?", "Solar, wind, hydro, bioenergy and other renewables as a share of the country's generation."),
             ]},
        ],
    },
]
